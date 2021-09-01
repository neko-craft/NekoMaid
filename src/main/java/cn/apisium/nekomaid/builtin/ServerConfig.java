package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.utils.OshiWrapper;
import cn.apisium.nekomaid.utils.Utils;
import org.bukkit.Server;
import org.bukkit.event.EventPriority;
import org.bukkit.event.server.ServerListPingEvent;
import org.jetbrains.annotations.Nullable;

@SuppressWarnings("deprecation")
public final class ServerConfig {
    private static String motd, data;
    private static boolean canGetData = true;
    @SuppressWarnings("unused")
    @Nullable
    public static String getMotd() { return motd; }
    public static void setMotd(@Nullable String motd) {
        ServerConfig.motd = motd == null || motd.isEmpty() ? null : motd;
    }
    private static boolean canSetMaxPlayers;
    static {
        try {
            Server.class.getMethod("setMaxPlayers", int.class);
            canSetMaxPlayers = true;
        } catch (Throwable ignored) { }
    }

    public static void init(NekoMaid main) {
        if (canSetMaxPlayers) main.GLOBAL_DATA.put("canSetMaxPlayers", true);
        main.onConnected(main, client -> client
                .on("server:set", args -> main.getServer().getScheduler().runTask(main, () -> {
                    switch ((String) args[0]) {
                        case "maxPlayers": if (canSetMaxPlayers) main.getServer().setMaxPlayers((int) args[1]); break;
                        case "spawnRadius": main.getServer().setSpawnRadius((int) args[1]); break;
                        case "hasWhitelist": main.getServer().setWhitelist((boolean) args[1]); break;
                        case "motd": setMotd((String) args[1]); break;
                    }
                })).onWithAck("server:fetchInfo", args -> {
                    if (data != null) return data;
                    if (canGetData) try {
                        return data = Utils.serializeToString(OshiWrapper.class.getMethod("getData")
                                .invoke(null));
                    } catch (Throwable ignored) { canGetData = false; }
                    return null;
                })
        );
        main.getServer().getPluginManager().registerEvent(ServerListPingEvent.class, main, EventPriority.NORMAL,
                (p, e) -> {
                    if (motd != null) ((ServerListPingEvent) e).setMotd(motd);
                }, main);
    }
}
