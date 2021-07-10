package cn.apisium.nekomaid;

import io.socket.socketio.server.SocketIoSocket;
import org.bukkit.plugin.Plugin;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.*;

@SuppressWarnings({"unused", "UnusedReturnValue"})
public final class Client {
    private final String plugin;
    private final SocketIoSocket client;
    private final HashSet<String> events = new HashSet<>();

    protected Client(Plugin plugin, SocketIoSocket client) {
        this(plugin.getName(), client);
    }
    protected Client(String plugin, SocketIoSocket client) {
        this.plugin = plugin + ":";
        this.client = client;
    }

    @Contract("_, _, _ -> this")
    @NotNull
    public <T> Client emit(@NotNull String name, @NotNull Runnable ackCallback, @Nullable Object... data) {
        events.add(name = plugin + name);
        client.send(name, data, args -> ackCallback.run());
        return this;
    }
    @Contract("_, _, _ -> this")
    @NotNull
    public Client emit(@NotNull String name, @NotNull Consumer<Object[]> ackCallback, @Nullable Object... data) {
        events.add(name = plugin + name);
        client.send(name, data, ackCallback::accept);
        return this;
    }
    @Contract("_, _ -> this")
    @NotNull
    public Client emit(@NotNull String name, @Nullable Object... data) {
        events.add(name = plugin + name);
        client.send(name, data);
        return this;
    }

    @Contract("_ -> this")
    @NotNull
    public Client leaveRoom(@NotNull String name) {
        client.leaveRoom(plugin + name);
        return this;
    }

    @Contract("_ -> this")
    @NotNull
    public Client joinRoom(@NotNull String name) {
        client.joinRoom(plugin + name);
        return this;
    }

    public void disconnect() {
        client.disconnect(true);
    }

    @SuppressWarnings("RedundantCast")
    @Contract("_, _ -> this")
    @NotNull
    public <T> Client onWithAck(@NotNull String name, @NotNull Function<Object[], T> listener) {
        events.add(name = plugin + name);
        client.on(name, args -> ((SocketIoSocket.ReceivedByLocalAcknowledgementCallback) args[args.length - 1])
                .sendAcknowledgement((Object) listener.apply(args)));
        return this;
    }

    @Contract("_, _ -> this")
    @NotNull
    public <T> Client onWithMultiArgsAck(@NotNull String name, @NotNull Function<Object[], T[]> listener) {
        events.add(name = plugin + name);
        client.on(name, args -> ((SocketIoSocket.ReceivedByLocalAcknowledgementCallback) args[args.length - 1])
                .sendAcknowledgement((Object[]) listener.apply(args)));
        return this;
    }

    @Contract("_, _ -> this")
    @NotNull
    public <T> Client onWithAck(@NotNull String name, @NotNull Consumer<Object[]> listener) {
        events.add(name = plugin + name);
        client.on(name, args -> {
            listener.accept(args);
            ((SocketIoSocket.ReceivedByLocalAcknowledgementCallback) args[args.length - 1]).sendAcknowledgement();
        });
        return this;
    }

    @Contract("_, _ -> this")
    @NotNull
    public Client onWithAck(@NotNull String name, @NotNull Runnable listener) {
        events.add(name = plugin + name);
        client.on(name, args -> {
            listener.run();
            ((SocketIoSocket.ReceivedByLocalAcknowledgementCallback) args[args.length - 1]).sendAcknowledgement();
        });
        return this;
    }

    @SuppressWarnings("RedundantCast")
    @Contract("_, _ -> this")
    @NotNull
    public <T> Client onWithAck(@NotNull String name, @NotNull Supplier<T> listener) {
        events.add(name = plugin + name);
        client.on(name, args -> ((SocketIoSocket.ReceivedByLocalAcknowledgementCallback) args[args.length - 1])
                .sendAcknowledgement((Object) listener.get()));
        return this;
    }

    @Contract("_, _ -> this")
    @NotNull
    public <T> Client onWithMultiArgsAck(@NotNull String name, @NotNull Supplier<T[]> listener) {
        events.add(name = plugin + name);
        client.on(name, args -> ((SocketIoSocket.ReceivedByLocalAcknowledgementCallback) args[args.length - 1])
                .sendAcknowledgement((Object[]) listener.get()));
        return this;
    }

    @Contract("_, _ -> this")
    @NotNull
    public Client on(@NotNull String name, @NotNull Consumer<Object[]> listener) {
        events.add(name = plugin + name);
        client.on(name, listener::accept);
        return this;
    }

    @Contract("_, _ -> this")
    @NotNull
    public Client on(@NotNull String name, @NotNull Runnable listener) {
        events.add(name = plugin + name);
        client.on(name, (args) -> listener.run());
        return this;
    }

    @Contract("_ -> this")
    @NotNull
    public Client off(@NotNull String name) {
        events.remove(name = plugin + name);
        client.off(name);
        return this;
    }

    @Contract("-> this")
    @NotNull
    public Client off() {
        events.forEach(client::off);
        events.clear();
        return this;
    }

    @NotNull
    public String getId() { return client.getId(); }
    @NotNull
    public Map<String, String> getInitialQuery() { return client.getInitialQuery(); }
    @NotNull
    public Map<String, List<String>> getInitialHeaders() { return client.getInitialHeaders(); }
}
