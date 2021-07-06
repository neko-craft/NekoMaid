package cn.apisium.nekomaid;

import com.corundumstudio.socketio.BroadcastAckCallback;
import com.corundumstudio.socketio.BroadcastOperations;
import com.corundumstudio.socketio.SocketIOClient;
import org.bukkit.plugin.Plugin;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;

import java.util.List;
import java.util.stream.Collectors;

@SuppressWarnings({"unused", "UnusedReturnValue"})
public final class Room {
    private final String plugin, roomName;
    protected Room(Plugin plugin, String roomName) {
        this.plugin = plugin.getName() + ":";
        this.roomName = this.plugin + roomName;
    }
    protected Room(String plugin, String roomName) {
        this.plugin = plugin;
        this.roomName = plugin + roomName;
    }

    private BroadcastOperations getRoom() {
        BroadcastOperations room = NekoMaid.INSTANCE.mainNamespace.getRoomOperations(roomName);
        return room.getClients().isEmpty() ? null : room;
    }

    @Contract("_, _, _ -> this")
    public Room emit(String name, SocketIOClient excludedClient, Object... data) {
        BroadcastOperations room = getRoom();
        if (room != null) room.sendEvent(plugin + name, excludedClient, data);
        return this;
    }

    @Contract("_, _ -> this")
    public Room emit(String name, Object... data) {
        BroadcastOperations room = getRoom();
        if (room != null) room.sendEvent(plugin + name, data);
        return this;
    }

    @Contract("_, _, _ -> this")
    public Room emit(String name, Object data, BroadcastAckCallback<?> ackCallback) {
        BroadcastOperations room = getRoom();
        if (room != null) room.sendEvent(plugin + name, data, ackCallback);
        return this;
    }

    @Contract("_, _, _, _ -> this")
    public Room emit(String name, Object data, SocketIOClient excludedClient, BroadcastAckCallback<?> ackCallback) {
        BroadcastOperations room = getRoom();
        if (room != null) room.sendEvent(plugin + name, data, excludedClient, ackCallback);
        return this;
    }

    @NotNull
    public List<Client> getClients() {
        return NekoMaid.INSTANCE.mainNamespace.getRoomOperations(roomName).getClients().stream()
                .map(it -> new Client(plugin, it)).collect(Collectors.toList());
    }
}
