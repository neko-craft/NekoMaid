package cn.apisium.nekomaid;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.VoidAckCallback;
import com.corundumstudio.socketio.store.Store;
import org.bukkit.plugin.Plugin;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.net.SocketAddress;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@SuppressWarnings({"unused", "UnusedReturnValue"})
public final class Client implements Store {
    private final String plugin;
    public final SocketIOClient client;
    protected Client(Plugin plugin, SocketIOClient client) {
        this.plugin = plugin.getName() + ":";
        this.client = client;
    }
    protected Client(String plugin, SocketIOClient client) {
        this.plugin = plugin;
        this.client = client;
    }

    @Contract("_, _, _ -> this")
    public <T> Client emit(@NotNull String name, @NotNull Runnable ackCallback, @Nullable Object... data) {
        client.sendEvent(plugin + name, new VoidAckCallback() {
            @Override
            protected void onSuccess() { ackCallback.run(); }
        }, data);
        return this;
    }
    @Contract("_, _, _ -> this")
    public <T> Client emit(@NotNull String name, @Nullable ACKCallback<T> ackCallback, @Nullable Object... data) {
        client.sendEvent(plugin + name, ackCallback, data);
        return this;
    }
    @Contract("_, _ -> this")
    public Client emit(@NotNull String name, @Nullable Object... data) {
        client.sendEvent(plugin + name, data);
        return this;
    }

    @Contract("_ -> this")
    public Client leaveRoom(@NotNull String name) {
        client.leaveRoom(plugin + name);
        return this;
    }

    @Contract("_ -> this")
    public Client joinRoom(@NotNull String name) {
        client.joinRoom(plugin + name);
        return this;
    }

    @NotNull
    public List<Room> getAllRooms() {
        return client.getAllRooms().stream().map(it -> new Room(plugin, it)).collect(Collectors.toList());
    }

    @Override
    public void set(@Nullable String key, @Nullable Object val) {
        client.set(plugin + key, val);
    }

    @Override
    public <T> T get(@Nullable String key) {
        return client.get(plugin + key);
    }

    @Override
    public boolean has(@Nullable String key) {
        return client.has(plugin + key);
    }

    @Override
    public void del(@Nullable String key) {
        client.del(plugin + key);
    }

    @NotNull
    public UUID getSessionId() {
        return client.getSessionId();
    }

    @NotNull
    public SocketAddress getAddress() {
        return client.getRemoteAddress();
    }

    public void disconnect() {
        client.disconnect();
    }
}
