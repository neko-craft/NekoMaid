package cn.apisium.nekomaid;

import cn.apisium.nekomaid.builtin.Console;
import com.corundumstudio.socketio.*;
import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Multimap;
import org.bukkit.command.CommandSender;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.server.PluginDisableEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.plugin.java.annotation.command.Command;
import org.bukkit.plugin.java.annotation.command.Commands;
import org.bukkit.plugin.java.annotation.permission.Permission;
import org.bukkit.plugin.java.annotation.permission.Permissions;
import org.bukkit.plugin.java.annotation.plugin.*;
import org.bukkit.plugin.java.annotation.plugin.author.Author;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.function.Consumer;
import java.util.jar.JarFile;
import java.util.stream.Collectors;

@SuppressWarnings({"unused", "UnusedReturnValue"})
@Plugin(name = "NekoMaid", version = "1.0")
@Description("A plugin can use Web to manage your server.")
@Author("Shirasawa")
@Website("https://neko-craft.com")
@ApiVersion(ApiVersion.Target.v1_13)
@Commands(@Command(name = "nekomaid", permission = "neko.maid.use", desc = "Can use NekoMaid.", aliases = "nm"))
@Permissions(@Permission(name = "neko.maid.use"))
public final class NekoMaid extends JavaPlugin implements Listener {
    public SocketIOServer server;
    public static NekoMaid INSTANCE;

    private final Multimap<org.bukkit.plugin.Plugin, String> pluginEventNames = ArrayListMultimap.create();
    private final HashMap<String, HashMap<String, AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>>>> pluginPages = new HashMap<>();
    protected final Multimap<String, File> pluginStaticPaths = ArrayListMultimap.create();
    protected final HashMap<String, AbstractMap.SimpleEntry<byte[], Long>> pluginStaticFiles = new HashMap<>();

    private Console console;

    { INSTANCE = this; }

    private static class PageSwitch { public String page, namespace; }

    @Override
    public void onEnable() {
        saveDefaultConfig();
        if (getConfig().getString("token", null) == null) {
            getConfig().set("token", UUID.randomUUID().toString());
            saveConfig();
        }
        final var config = new Configuration();
        config.setPort(getConfig().getInt("port", 11451));
        config.setHostname(getConfig().getString("listenHostname", null));
        config.setHttpCompression(false);
        config.setAuthorizationListener(it -> getConfig().getString("token", "").equals(it.getSingleUrlParam("token")));
        server = new SocketIOServer(config);
        server.setPipelineFactory(new Pipeline());
        server.addEventListener("switchPage", PageSwitch.class, (a, b, c) -> {
            var oldPageObj = (PageSwitch) a.get("page");
            Client client = null;
            if (oldPageObj != null) {
                a.leaveRoom(oldPageObj.namespace + ":page:" + oldPageObj.page);
                var oldPages = pluginPages.get(oldPageObj.namespace);
                if (oldPages != null) {
                    var oldPage = oldPages.get(oldPageObj.page);
                    if (oldPage != null && oldPage.getValue() != null) oldPage.getValue().accept(client = new Client(b.namespace + ":", a));
                }
            }
            a.set("page", b);
            a.joinRoom(b.namespace + ":page:" + b.page);
            var pages = pluginPages.get(b.namespace);
            if (pages == null) return;
            var page = pages.get(b.page);
            if (page != null && page.getKey() != null) page.getKey().accept(client == null ? new Client(b.namespace + ":", a) : client);
        });
        server.startAsync();

        console = new Console(this);

        getServer().getPluginManager().registerEvents(this, this);
        getCommand("nekomaid").setExecutor(this);
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, org.bukkit.command.@NotNull Command command, @NotNull String label, @NotNull String[] args) {
        new RuntimeException("@33").printStackTrace();
         return true;
    }

    @Override
    public void onDisable() {
        if (console != null) console.stop();
        if (server != null) server.stop();
    }

    @Contract("_, _, _, _ -> this")
    public NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull SocketIOClient excludedClient, @NotNull Object... data) {
        if (!server.getAllClients().isEmpty()) server.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, excludedClient, data);
        return this;
    }
    @Contract("_, _, _ -> this")
    public NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull Object... data) {
        if (!server.getAllClients().isEmpty()) server.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, data);
        return this;
    }
    @Contract("_, _, _, _, _ -> this")
    public <T> NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull Object data, @NotNull SocketIOClient excludedClient, @NotNull BroadcastAckCallback<T> ackCallback) {
        if (!server.getAllClients().isEmpty()) server.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, data, excludedClient, ackCallback);
        return this;
    }
    @Contract("_, _, _, _ -> this")
    public <T> NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull Object data, @NotNull BroadcastAckCallback<T> ackCallback) {
        if (!server.getAllClients().isEmpty()) server.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, data, ackCallback);
        return this;
    }

    @Contract("_, _, _, _, _ -> this")
    public <T> NekoMaid emit(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull SocketIOClient client, @Nullable ACKCallback<T> ackCallback, @Nullable Object... data) {
        client.sendEvent(plugin.getName() + ":" + name, ackCallback, data);
        return this;
    }
    @Contract("_, _, _, _, _ -> this")
    public <T> NekoMaid emit(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull SocketIOClient client, @NotNull Runnable ackCallback, @Nullable Object... data) {
        client.sendEvent(plugin.getName() + ":" + name, new VoidAckCallback() {
            @Override
            protected void onSuccess() { ackCallback.run(); }
        }, data);
        return this;
    }
    @Contract("_, _, _, _ -> this")
    public NekoMaid emit(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull SocketIOClient client, @Nullable Object... data) {
        client.sendEvent(plugin.getName() + ":" + name, data);
        return this;
    }

    public @NotNull Room getRoom(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name) {
        return new Room(plugin, name);
    }

    @Contract("_, _, _, _ -> this")
    public <T> NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @Nullable Class<T> eventClass, @NotNull DataListener<T> listener) {
        server.addEventListener(plugin.getName() + ":" + eventName, eventClass, (a, b, c) -> listener.onData(new Client(plugin, a), b, c));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _, _ -> this")
    public NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @NotNull DataListener<Void> listener) {
        server.addEventListener(plugin.getName() + ":" + eventName, null, (a, b, c) -> listener.onData(new Client(plugin, a), null, c));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @NotNull
    public Room onSwitchPage(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String page, @Nullable Consumer<Client> onEnter) {
        return onSwitchPage(plugin, page, onEnter, null);
    }

    @NotNull
    public Room onSwitchPage(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String page, @Nullable Consumer<Client> onEnter, @Nullable Consumer<Client> onLeave) {
        if (onEnter != null || onLeave != null)
            pluginPages.computeIfAbsent(plugin.getName(), k -> new HashMap<>()).computeIfAbsent(page, k -> new AbstractMap.SimpleEntry<>(onEnter, onLeave));
        return getPage(plugin, page);
    }

    @NotNull
    public Room getPage(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String page) {
        return new Room(plugin, "page:" + page);
    }

    @Contract("_, _ -> this")
    public NekoMaid addStaticPath(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull File path) {
        if (!path.isDirectory()) throw new RuntimeException("Path is not a directory.");
        if (pluginStaticPaths.containsValue(path)) throw new RuntimeException("The path already exists.");
        pluginStaticPaths.put(plugin.getName(), path);
        return this;
    }

    @Contract("_, _, _ -> this")
    public NekoMaid addStaticFile(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String path, byte[] data) {
        addStaticFile(plugin, path, data, 0);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    @SuppressWarnings("UnusedReturnValue")
    public NekoMaid addStaticFile(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String path, byte[] data, long time) {
        pluginStaticFiles.put(plugin.getName() + "/" + path, new AbstractMap.SimpleEntry<>(data, time == 0 ? new Date().getTime() : time));
        return this;
    }

    @Contract("_, _, _ -> this")
    public NekoMaid addStaticFiles(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull JarFile jarFile, @NotNull String path) {
        var iterator = jarFile.entries();
        while (iterator.hasMoreElements()) {
            var it = iterator.nextElement();
            var name = it.getName();
            if (name.startsWith(path) && !it.isDirectory()) {
                try (var is = jarFile.getInputStream(it)) {
                    path = name.substring(path.length());
                    pluginStaticFiles.put(plugin.getName() + (path.startsWith("/") ? path : "/" + path),
                            new AbstractMap.SimpleEntry<>(is.readAllBytes(), it.getTime()));
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
        return this;
    }

    @NotNull
    public List<Client> getAllClients(@NotNull org.bukkit.plugin.Plugin plugin) {
        return server.getAllClients().stream().map(it -> new Client(plugin, it)).collect(Collectors.toUnmodifiableList());
    }

    @EventHandler
    public void onPluginDisable(PluginDisableEvent e) {
        var name = e.getPlugin().getName();
        pluginPages.remove(name);
        var list = pluginEventNames.get(e.getPlugin());
        if (list != null) {
            list.forEach(server::removeAllListeners);
            pluginEventNames.removeAll(e.getPlugin());
        }
        pluginStaticPaths.removeAll(name);
        var name2 = name + "/";
        pluginStaticFiles.keySet().removeIf(s -> s.startsWith(name2));
        var name3 = name + ":";
        server.getAllClients().forEach(it -> it.getAllRooms().forEach(r -> {
            if (r.startsWith(name3)) it.leaveRoom(r);
        }));
    }
}
