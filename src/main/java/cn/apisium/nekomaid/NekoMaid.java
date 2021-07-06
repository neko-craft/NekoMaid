package cn.apisium.nekomaid;

import cn.apisium.nekomaid.builtin.BuiltinPlugins;
import cn.apisium.uniporter.Uniporter;
import com.corundumstudio.socketio.*;
import com.corundumstudio.socketio.namespace.Namespace;
import com.corundumstudio.socketio.namespace.NamespacesHub;
import com.corundumstudio.socketio.protocol.JacksonJsonSupport;
import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Multimap;
import org.bukkit.command.CommandSender;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.server.PluginDisableEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.plugin.java.annotation.command.Command;
import org.bukkit.plugin.java.annotation.command.Commands;
import org.bukkit.plugin.java.annotation.dependency.Dependency;
import org.bukkit.plugin.java.annotation.permission.Permission;
import org.bukkit.plugin.java.annotation.permission.Permissions;
import org.bukkit.plugin.java.annotation.plugin.*;
import org.bukkit.plugin.java.annotation.plugin.author.Author;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.*;
import java.util.function.*;
import java.util.stream.Collectors;

@SuppressWarnings({"unused", "UnusedReturnValue"})
@Plugin(name = "NekoMaid", version = "1.0")
@Description("A plugin can use Web to manage your server.")
@Author("Shirasawa")
@Website("https://neko-craft.com")
@ApiVersion(ApiVersion.Target.v1_13)
@Commands(@Command(name = "nekomaid", permission = "neko.maid.use", desc = "Can use NekoMaid.", aliases = "nm"))
@Permissions(@Permission(name = "neko.maid.use"))
@Dependency("Uniporter")
public final class NekoMaid extends JavaPlugin implements Listener {
    public static NekoMaid INSTANCE;

    private final Multimap<org.bukkit.plugin.Plugin, String> pluginEventNames = ArrayListMultimap.create();
    private final HashMap<String, HashMap<String, AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>>>> pluginPages = new HashMap<>();

    private BuiltinPlugins plugins;

    { INSTANCE = this; }

    private static class PageSwitch { public String page, namespace; }
    private Handler handler;
    protected SocketIONamespace mainNamespace;

    @SuppressWarnings("ConstantConditions")
    @Override
    public void onEnable() {
        saveDefaultConfig();
        if (getConfig().getString("token", null) == null) {
            getConfig().set("token", UUID.randomUUID().toString());
            saveConfig();
        }
        final Configuration config = new Configuration();
        config.setJsonSupport(new JacksonJsonSupport());
        config.setAuthorizationListener(it -> {
            System.out.println(it.getSingleUrlParam("token"));
            return getConfig().getString("token", "").equals(it.getSingleUrlParam("token"));
        });
        NamespacesHub namespacesHub = new NamespacesHub(config);
        mainNamespace = namespacesHub.create(Namespace.DEFAULT_NAME);
        handler = new Handler(config, namespacesHub);
        mainNamespace.addConnectListener(it -> {
            HashMap<String, Object> map = new HashMap<>();
            map.put("version", getServer().getVersion());
            map.put("onlineMode", getServer().getOnlineMode());
            map.put("hasWhitelist", getServer().hasWhitelist());
            it.sendEvent("globalData", map);
        });
        mainNamespace.addEventListener("switchPage", PageSwitch.class, (a, b, c) -> {
            PageSwitch oldPageObj = a.get("page");
            Client client = null;
            if (oldPageObj != null) {
                a.leaveRoom(oldPageObj.namespace + ":page:" + oldPageObj.page);
                HashMap<String, AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>>> oldPages = pluginPages.get(oldPageObj.namespace);
                if (oldPages != null) {
                    AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>> oldPage = oldPages.get(oldPageObj.page);
                    if (oldPage != null && oldPage.getValue() != null) oldPage.getValue().accept(client = new Client(b.namespace + ":", a));
                }
            }
            a.set("page", b);
            a.joinRoom(b.namespace + ":page:" + b.page);
            HashMap<String, AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>>> pages = pluginPages.get(b.namespace);
            if (pages == null) return;
            AbstractMap.SimpleEntry<Consumer<Client>, Consumer<Client>> page = pages.get(b.page);
            if (page != null && page.getKey() != null) page.getKey().accept(client == null ? new Client(b.namespace + ":", a) : client);
        });
        Uniporter.registerHandler("NekoMaid", handler, true);

        plugins = new BuiltinPlugins(this);

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
        handler.stop();
        plugins.disable();
    }

    @Contract("_, _, _, _ -> this")
    public NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull SocketIOClient excludedClient, @NotNull Object... data) {
        if (!mainNamespace.getAllClients().isEmpty()) mainNamespace.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, excludedClient, data);
        return this;
    }
    @Contract("_, _, _ -> this")
    public NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull Object... data) {
        if (!mainNamespace.getAllClients().isEmpty()) mainNamespace.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, data);
        return this;
    }
    @Contract("_, _, _, _, _ -> this")
    public <T> NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull Object data, @NotNull SocketIOClient excludedClient, @NotNull BroadcastAckCallback<T> ackCallback) {
        if (!mainNamespace.getAllClients().isEmpty()) mainNamespace.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, data, excludedClient, ackCallback);
        return this;
    }
    @Contract("_, _, _, _ -> this")
    public <T> NekoMaid emitToAll(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String name, @NotNull Object data, @NotNull BroadcastAckCallback<T> ackCallback) {
        if (!mainNamespace.getAllClients().isEmpty()) mainNamespace.getBroadcastOperations().sendEvent(plugin.getName() + ":" + name, data, ackCallback);
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
    public <T, R> NekoMaid onWithAck(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @Nullable Class<T> eventClass, @NotNull Function<T, R> listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, eventClass, (a, b, c) -> c.sendAckData(listener.apply(b)));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _, _ -> this")
    public NekoMaid onWithAck(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @NotNull Supplier<?> listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, null, (a, b, c) -> c.sendAckData(listener.get()));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public <T, R> NekoMaid onWithAck(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @Nullable Class<T> eventClass, @NotNull BiFunction<Client, T, R> listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, eventClass, (a, b, c) -> c.sendAckData(listener.apply(new Client(plugin, a), b)));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public <T> NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @Nullable Class<T> eventClass, @NotNull DataListener<T> listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, eventClass, (a, b, c) -> listener.onData(new Client(plugin, a), b, c));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public <T> NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @Nullable Class<T> eventClass, @NotNull BiConsumer<Client, T> listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, eventClass, (a, b, c) -> listener.accept(new Client(plugin, a), b));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public <T, R> NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @Nullable Class<T> eventClass, @NotNull Consumer<T> listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, eventClass, (a, b, c) -> listener.accept(b));
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public <T> NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @Nullable Class<T> eventClass, @NotNull Runnable listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, null, (a, b, c) -> listener.run());
        pluginEventNames.put(plugin, eventName);
        return this;
    }

    @Contract("_, _ -> this")
    public NekoMaid off(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName) {
        mainNamespace.removeAllListeners(plugin.getName() + ":" + eventName);
        pluginEventNames.remove(plugin, eventName);
        return this;
    }

    @Contract("_, _, _ -> this")
    public NekoMaid on(@NotNull org.bukkit.plugin.Plugin plugin, @NotNull String eventName, @NotNull DataListener<Void> listener) {
        mainNamespace.addEventListener(plugin.getName() + ":" + eventName, null, (a, b, c) -> listener.onData(new Client(plugin, a), null, c));
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

    @NotNull
    public List<Client> getAllClients(@NotNull org.bukkit.plugin.Plugin plugin) {
        return mainNamespace.getAllClients().stream().map(it -> new Client(plugin, it)).collect(Collectors.toList());
    }

    @EventHandler
    public void onPluginDisable(PluginDisableEvent e) {
        String name = e.getPlugin().getName();
        pluginPages.remove(name);
        Collection<String> list = pluginEventNames.get(e.getPlugin());
        if (list != null) {
            list.forEach(mainNamespace::removeAllListeners);
            pluginEventNames.removeAll(e.getPlugin());
        }
        String name2 = name + ":";
        mainNamespace.getAllClients().forEach(it -> it.getAllRooms().forEach(r -> {
            if (r.startsWith(name2)) it.leaveRoom(r);
        }));
    }
}
