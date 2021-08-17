package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import org.bukkit.Server;

final class Options {
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
                    }
        })));
    }
}
