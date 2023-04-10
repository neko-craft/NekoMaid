package cn.apisium.nekomaid;

import cn.apisium.nekomaid.builtin.BuiltinPlugins;
import cn.apisium.nekomaid.utils.GeoIP;
import cn.apisium.nekomaid.utils.OshiWrapper;
import cn.apisium.nekomaid.utils.Utils;
import cn.apisium.netty.engineio.EngineIoHandler;
import cn.apisium.uniporter.Uniporter;
import cn.apisium.uniporter.router.api.Route;
import cn.apisium.uniporter.router.api.UniporterHttpHandler;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.collect.ArrayListMultimap;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.http.*;
import io.netty.handler.codec.http.websocketx.extensions.compression.WebSocketServerCompressionHandler;
import io.socket.engineio.server.EngineIoServer;
import io.socket.socketio.server.SocketIoAdapter;
import io.socket.socketio.server.SocketIoNamespace;
import io.socket.socketio.server.SocketIoServer;
import io.socket.socketio.server.SocketIoSocket;
import org.bstats.bukkit.Metrics;
import org.bukkit.ChatColor;
import org.bukkit.command.CommandSender;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.server.PluginDisableEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.plugin.java.annotation.command.Command;
import org.bukkit.plugin.java.annotation.command.Commands;
import org.bukkit.plugin.java.annotation.dependency.Dependency;
import org.bukkit.plugin.java.annotation.dependency.SoftDependency;
import org.bukkit.plugin.java.annotation.permission.Permission;
import org.bukkit.plugin.java.annotation.permission.Permissions;
import org.bukkit.plugin.java.annotation.plugin.*;
import org.bukkit.plugin.java.annotation.plugin.author.Author;
import org.bukkit.util.CachedServerIcon;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.net.URLClassLoader;
import java.net.URLEncoder;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.function.*;
import java.util.stream.Collectors;

@SuppressWarnings({"UnusedReturnValue", "unused"})
@Plugin(name = "NekoMaid", version = "0.0.0")
@Description("A plugin can use Web to manage your server.")
@Author("Shirasawa")
@Website("https://neko-craft.com")
@ApiVersion(ApiVersion.Target.v1_13)
@Commands(@Command(name = "nekomaid", permission = "neko.maid.use", desc = "Can use NekoMaid.", aliases = "nm"))
@Permissions(@Permission(name = "neko.maid.use"))
@Dependency("Uniporter")
@SoftDependency("Vault")
@SoftDependency("NBTAPI")
@SoftDependency("OpenInv")
@SoftDependency("InvSeePlusPlus")
@SoftDependency("PlugMan")
@SoftDependency("ServerUtils")
@SoftDependency("PlaceholderAPI")
@SoftDependency("Multiverse-Core")
public final class NekoMaid extends JavaPlugin implements Listener {
    private final static String UNIPORTER_VERSION = "1.3.4-SNAPSHOT";
    private final static String URL_MESSAGE = ChatColor.translateAlternateColorCodes('&',
            "&e[NekoMaid] &fOpen this url to manage your server: &7"),
            SUCCESS = ChatColor.translateAlternateColorCodes('&',
                    "&e[NekoMaid] &aSuccess!"),
            VERSION = ChatColor.translateAlternateColorCodes('&',
                    "&e[NekoMaid] &7Version: &a"),
            DIAGNOSTIC = ChatColor.translateAlternateColorCodes('&',
                    "&e[NekoMaid] &7Diagnosing URL: &a");
    public static NekoMaid INSTANCE;
    { INSTANCE = this; }

    private final ArrayListMultimap<org.bukkit.plugin.Plugin, Consumer<Client>> connectListeners = ArrayListMultimap.create();
    private final HashMap<String, Map.Entry<org.bukkit.plugin.Plugin, NekoMaidCommand>> pluginCommands = new HashMap<>();
    private final HashMap<String, HashMap<String, AbstractMap.SimpleEntry<Consumer<Client>,
            Consumer<Client>>>> pluginPages = new HashMap<>();

    private BuiltinPlugins plugins;
    private EngineIoServer engineIoServer;
    private final ConcurrentHashMap<SocketIoSocket, String[]> pages = new ConcurrentHashMap<>();
    private final HashMap<SocketIoSocket, HashMap<String, Client>> clients = new HashMap<>();
    private final Cache<String, Boolean> tempTokens = CacheBuilder.newBuilder().maximumSize(10)
            .expireAfterWrite(60, TimeUnit.MINUTES).build();
    private final JSONObject pluginScripts = new JSONObject();
    private URLClassLoader loader;
    private GeoIP geoIP;
    private boolean debug;
    public SocketIoNamespace io;
    @SuppressWarnings("ProtectedMemberInFinalClass")
    protected Map<String, Set<SocketIoSocket>> mRoomSockets;

    final public JSONObject GLOBAL_DATA = new JSONObject();

    @SuppressWarnings({"ConstantConditions", "unchecked"})
    @Override
    public void onEnable() {
        saveDefaultConfig();
        if (Utils.hasNBTAPI()) { GLOBAL_DATA.put("hasNBTAPI", true); }
        GLOBAL_DATA
                .put("plugins", pluginScripts)
                .put("version", getServer().getVersion())
                .put("onlineMode", getServer().getOnlineMode())
                .put("pluginVersion", getDescription().getVersion());
        syncGlobalData();
        if (Utils.IS_PAPER) GLOBAL_DATA.put("isPaper", true);
        try {
            CachedServerIcon icon = getServer().getServerIcon();
            if (icon != null && !icon.isEmpty()) GLOBAL_DATA.put("icon", icon.getData());
        } catch (Throwable ignored) { }
        if (getConfig().getString("token", null) == null) {
            getConfig().set("token", UUID.randomUUID().toString());
            saveConfig();
        }

        String version = getServer().getPluginManager().getPlugin("Uniporter").getDescription().getVersion();
        if (!UNIPORTER_VERSION.equals(version)) {
            getLogger().warning("Unsupported Uniporter version: " + version + ", it should be: " + UNIPORTER_VERSION);
        }

        engineIoServer = new EngineIoServer();
        io = new SocketIoServer(engineIoServer).namespace("/");
        try {
            Field field = SocketIoAdapter.class.getDeclaredField("mRoomSockets");
            field.setAccessible(true);
            mRoomSockets = (Map<String, Set<SocketIoSocket>>) field.get(io.getAdapter());
        } catch (Throwable e) {
            e.printStackTrace();
            setEnabled(false);
            return;
        }
        io.on("connection", arr -> {
            SocketIoSocket client = (SocketIoSocket) arr[0];
            Object obj = client.getConnectData();
            if (!(obj instanceof JSONObject)) {
                client.send("!");
                client.disconnect(false);
                return;
            }
            String token = ((JSONObject) obj).getString("token");
            if (token == null || token.isEmpty() || token.length() > 100 ||
                    (!getConfig().getString("token", "").equals(token) && tempTokens.getIfPresent(token) == null)) {
                client.send("!");
                client.disconnect(false);
                return;
            }
            client.once("disconnect", args -> {
                pages.remove(client);
                clients.remove(client);
            }).on("switchPage", args -> {
                try {
                    String[] oldPageObj = pages.get(client);
                    Client wrappedClient = null;
                    if (oldPageObj != null) {
                        client.leaveRoom(oldPageObj[0] + ":page:" + oldPageObj[1]);
                        HashMap<String, AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>>> oldPages =
                                pluginPages.get(oldPageObj[0]);
                        if (oldPages != null) {
                            AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>> oldPage = oldPages.get(oldPageObj[1]);
                            if (oldPage != null && oldPage.getValue() != null) oldPage.getValue()
                                    .accept(wrappedClient = getClient(oldPageObj[0], client));
                        }
                    }
                    String namespace = (String) args[0], page = (String) args[1];
                    pages.put(client, new String[]{ namespace, page });
                    client.joinRoom(namespace + ":page:" + page);
                    HashMap<String, AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>>> pages = pluginPages.get(namespace);
                    if (pages == null) return;
                    AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>> pageAction = pages.get(page);
                    if (pageAction != null && pageAction.getKey() != null) pageAction.getKey()
                            .accept(wrappedClient == null ? getClient(namespace, client) : wrappedClient);
                } catch (Throwable e) {e.printStackTrace();}
            });
            connectListeners.forEach((k, v) -> v.accept(getClient(k, client)));
            GLOBAL_DATA
                    .put("hasWhitelist", getServer().hasWhitelist())
                    .put("maxPlayers", getServer().getMaxPlayers())
                    .put("spawnRadius", getServer().getSpawnRadius());
            client.send("globalData", GLOBAL_DATA);
        }).on("error", System.out::println);
        Uniporter.registerHandler("NekoMaid", new MainHandler(), true);

        geoIP = new GeoIP(this);
        plugins = new BuiltinPlugins(this);

        getServer().getPluginManager().registerEvent(PluginDisableEvent.class, this, EventPriority.NORMAL, (a, e) -> {
            org.bukkit.plugin.Plugin p = ((PluginDisableEvent) e).getPlugin();
            String name = p.getName();
            pluginPages.remove(name);
            clients.forEach((k, v) -> v.remove(name));
            connectListeners.removeAll(p);
            pluginScripts.remove(name);
            pluginCommands.values().removeIf(it -> it.getKey() == p);
        }, this);
        setupCommands();
        new Metrics(this, 12238);
    }

    @SuppressWarnings("deprecation")
    private static void sendUsages(CommandSender sender, String name, String[] arr) {
        String str = ChatColor.GRAY + "/nekomaid " + ChatColor.AQUA + name + " ";
        if (arr == null) sender.spigot().sendMessage(Utils.getCommandComponent(str));
        else for (String s : arr) {
            sender.spigot().sendMessage(Utils.getCommandComponent(str + Arrays.stream(s.split(" "))
                    .map(it -> (it.startsWith("[") ? ChatColor.GREEN : ChatColor.YELLOW) + it)
                    .collect(Collectors.joining(" "))));
        }
    }

    private void sendHelp(CommandSender sender) {
        sender.sendMessage(VERSION + getDescription().getVersion());
        pluginCommands.forEach((k, v) -> sendUsages(sender, k, v.getValue().getUsages()));
    }

    private void syncGlobalData() {
        debug = getConfig().getBoolean("debug", false);
        String bMapKey = getConfig().getString("baidu-map-license-key", "");
        if (bMapKey.isEmpty()) GLOBAL_DATA.remove("bMapKey");
        else GLOBAL_DATA.put("bMapKey", bMapKey);
        String skin = getConfig().getString("skin-url", "");
        if (skin.isEmpty()) GLOBAL_DATA.remove("skinUrl");
        else GLOBAL_DATA.put("skinUrl", skin);
        String head = getConfig().getString("head-url", "");
        if (head.isEmpty()) GLOBAL_DATA.remove("headUrl");
        else GLOBAL_DATA.put("headUrl", head);
    }

    private void setupCommands() {
        registerCommand(this, "reload", (sender, command, label, args) -> {
            reloadConfig();
            syncGlobalData();
            sender.sendMessage(SUCCESS);
            return true;
        });
        registerCommand(this, "help", (sender, command, label, args) -> {
            sendHelp(sender);
            return true;
        });
        registerCommand(this, "temp", (sender, command, label, args) -> {
            try {
                String token = UUID.randomUUID().toString();
                tempTokens.get(token, () -> false);
                String url = getConnectUrl(token);
                sender.sendMessage(URL_MESSAGE + url);
                return true;
            } catch (ExecutionException e) { throw new RuntimeException(e); }
        });
        registerCommand(this, "invalidate", (sender, command, label, args) -> {
            tempTokens.cleanUp();
            sender.sendMessage(SUCCESS);
            return true;
        });
        registerCommand(this, "diagnostic", (sender, command, label, args) -> {
            int port = getConnectPort();
            String hostname = (Uniporter.isSSLPort(port) ? "https://" : "http://") +
                    getConnectHostname(port, "EIO=4&transport=polling");
            sender.sendMessage(DIAGNOSTIC + hostname);
            Utils.diagnosticConnections(hostname, sender);
            return true;
        });

        Objects.requireNonNull(getServer().getPluginCommand("nekomaid")).setTabCompleter(this);
    }

    @NotNull
    public GeoIP getGeoIP() { return geoIP; }

    public boolean isDebug() { return debug; }

    public int getClientsCount() { return clients.size(); }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, org.bukkit.command.@NotNull Command command,
                             @NotNull String label, @NotNull String[] args) {
        if (!command.testPermission(sender)) return true;
        if (args.length == 0) sender.sendMessage(URL_MESSAGE + getConnectUrl());
        else {
            Map.Entry<org.bukkit.plugin.Plugin, NekoMaidCommand> it = pluginCommands.get(args[0]);
            if (it == null) sendHelp(sender);
            else if (!it.getValue().onCommand(sender, command, label, Arrays.copyOfRange(args, 1, args.length)))
                sendUsages(sender, args[0], it.getValue().getUsages());
        }
        return true;
    }

    @NotNull
    public String getConnectUrl() { return getConnectUrl(getConfig().getString("token", "")); }

    public int getConnectPort() {
        return Uniporter.findPortsByHandler("NekoMaid").stream().findFirst().orElseGet(getServer()::getPort);
    }

    @NotNull
    public String getConnectHostname(@NotNull String token) {
        return getConnectHostname(getConnectPort(), token);
    }

    @NotNull
    public String getConnectHostname(int port, @Nullable String token) {
        String url = getConfig().getString("hostname", "");
        Optional<Route> it = Uniporter.findRoutesByHandler("NekoMaid").stream().findFirst();
        if (!it.isPresent()) throw new RuntimeException("Handler not registered!");
        Route route = it.get();
        return (url.contains(":") ? url : url + ":" + port) + route.getPath() + (token == null ? "" : "?" + token);
    }

    @NotNull
    public String getConnectUrl(@NotNull String token) {
        String custom = getConfig().getString("customAddress", "");
        int port = getConnectPort();
        String url = getConnectHostname(port, token);
        try { url = URLEncoder.encode(url, "UTF-8"); } catch (Throwable ignored) { }
        return custom.isEmpty()
                ? (Uniporter.isSSLPort(port) ? "https" : "http") + "://maid.neko-craft.com/?" + url
                : custom.replace("{token}", token).replace("{hostname}", url);
    }

    @Contract("_, _, _ -> this")
    public NekoMaid registerCommand(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull NekoMaidCommand cmd) {
        Objects.requireNonNull(plugin);
        Objects.requireNonNull(name);
        Objects.requireNonNull(cmd);
        pluginCommands.put(name, new AbstractMap.SimpleEntry<>(plugin, cmd));
        return this;
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, org.bukkit.command.@NotNull Command command,
                                      @NotNull String alias, @NotNull String[] args) {
        switch (args.length) {
            case 0: return Collections.emptyList();
            case 1: return new ArrayList<>(pluginCommands.keySet());
            default:
                Map.Entry<org.bukkit.plugin.Plugin, NekoMaidCommand> it = pluginCommands.get(args[0]);
                if (it == null) return Collections.emptyList();
                else return it.getValue().onTabComplete(sender, command, alias, Arrays.copyOfRange(args, 1, args.length));
        }
    }

    @Override
    public void onDisable() {
        Uniporter.removeHandler("NekoMaid");
        pages.clear();
        connectListeners.clear();
        pluginCommands.clear();
        if (engineIoServer != null) engineIoServer.shutdown();
        if (plugins != null) plugins.disable();
        if (loader != null) try {
            loader.close();
        } catch (Throwable e) {
            e.printStackTrace();
        }
        try {
            OshiWrapper.stop();
        } catch (Throwable ignored) { }
    }

    public int getClientsCountInPage(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String page) {
        if (mRoomSockets == null) return 0;
        Set<SocketIoSocket> set = mRoomSockets.get(plugin.getName() + ":page:" + page);
        return set == null ? 0 : set.size();
    }

    public int getClientsCountInRoom(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String room) {
        if (mRoomSockets == null) return 0;
        Set<SocketIoSocket> set = mRoomSockets.get(plugin.getName() + ":" + room);
        return set == null ? 0 : set.size();
    }

    @Contract("_, _, _ -> this")
    public NekoMaid broadcast(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull Object... data) {
        if (!clients.isEmpty()) io.broadcast((String) null, plugin.getName() + ":" + name, data);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public NekoMaid broadcast(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String room,
                              @NotNull String name, @NotNull Object... data) {
        if (getClientsCountInRoom(plugin, room) != 0) {
            Utils.serialize(data);
            String prefix = plugin.getName() + ":";
            io.broadcast(prefix + room, prefix + name, data);
        }
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public NekoMaid broadcastInPage(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String page,
                              @NotNull String name, @NotNull Object... data) {
        return broadcast(plugin, "page:" + page, name, data);
    }

    private Client getClient(org.bukkit.plugin.Plugin plugin, SocketIoSocket client) {
        return getClient(plugin.getName(), client);
    }

    private Client getClient(String plugin, SocketIoSocket client) {
        return clients.computeIfAbsent(client, (a) -> new HashMap<>())
                .computeIfAbsent(plugin, (a) -> new Client(plugin, client));
    }

    @Contract("_, _ -> this")
    public NekoMaid onConnected(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull Consumer<Client> fn) {
        Objects.requireNonNull(plugin);
        Objects.requireNonNull(fn);
        connectListeners.put(plugin, fn);
        return this;
    }

    @Contract("_, _ -> this")
    public NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull Consumer<Client> fn) {
        Objects.requireNonNull(plugin);
        Objects.requireNonNull(fn);
        connectListeners.put(plugin, fn);
        return this;
    }

    @Contract("_, _, _ -> this")
    @NotNull
    public NekoMaid onSwitchPage(@NotNull org.bukkit.plugin.Plugin plugin,
                             @NotNull String page, @Nullable Consumer<Client> onEnter) {
        return onSwitchPage(plugin, page, onEnter, null);
    }

    @Contract("_, _, _, _ -> this")
    @NotNull
    public NekoMaid onSwitchPage(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String page,
                             @Nullable Consumer<Client> onEnter, @Nullable Consumer<Client> onLeave) {
        Objects.requireNonNull(plugin);
        Objects.requireNonNull(page);
        if (onEnter != null || onLeave != null)
            pluginPages.computeIfAbsent(plugin.getName(), k -> new HashMap<>())
                    .computeIfAbsent(page, k -> new AbstractMap.SimpleEntry<>(onEnter, onLeave));
        return this;
    }

    @Contract("_, _ -> this")
    @NotNull
    public NekoMaid addScript(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String script) {
        Objects.requireNonNull(plugin);
        Objects.requireNonNull(script);
        String name = plugin.getName();
        if (!pluginScripts.has(name)) pluginScripts.put(name, new JSONArray());
        pluginScripts.getJSONArray(name).put(script);
        return this;
    }

    private final class MainHandler implements UniporterHttpHandler {
        @Override
        public void handle(String path, Route route, ChannelHandlerContext context, FullHttpRequest request) {
            if (route.isGzip()) context.pipeline().addLast(new HttpContentCompressor())
                    .addLast(new WebSocketServerCompressionHandler());
            context.channel().pipeline().addLast(new EngineIoHandler(engineIoServer, null,
                    "ws://maid.neko-craft.com", 1024 * 1024 * 5) {
                @Override
                public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
                    if (debug) cause.printStackTrace();
                }
            });
        }

        @Override
        public boolean needReFire() { return true; }
    }
}
