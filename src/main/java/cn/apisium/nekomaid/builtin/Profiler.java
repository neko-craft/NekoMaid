package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.TimingsV2;
import org.bukkit.scheduler.BukkitTask;

@SuppressWarnings("unchecked")
final class Profiler {
    private final NekoMaid main;
    private BukkitTask statusTimer, timingsTimer;
    private boolean started;
    private static boolean isTimingsV2;

    static {
        try {
            // noinspection ResultOfMethodCallIgnored
            TimingsV2.isStarted();
            isTimingsV2 = true;
        } catch (Throwable ignored) { }
    }

    public Profiler(NekoMaid main) {
        this.main = main;
        if (isTimingsV2) main.GLOBAL_DATA.put("isTimingsV2", true);
        main.onConnected(main, client -> client.on("profiler:status", args -> {
            main.GLOBAL_DATA.put("profilerStarted", started = (boolean) args[0]);
            main.broadcast(main, "profiler:status", started);
            checkTask();
        }));
    }

    private void checkTask() {
        if (started) {
            statusTimer.cancel();
            statusTimer = null;
            if (isTimingsV2) {
                timingsTimer.cancel();
                timingsTimer = null;
            }
        } else {
            if (isTimingsV2) {
                timingsTimer = main.getServer().getScheduler().runTaskTimerAsynchronously(main, () -> {

                }, 30 * 20, 30 * 20);
            }
        }
    }

    private static final class Status {
        public double tps, mspt, cpu, ;
    }
}
