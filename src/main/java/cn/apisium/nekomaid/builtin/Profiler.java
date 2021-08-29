package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.OshiWrapper;
import cn.apisium.nekomaid.TimingsV2;
import cn.apisium.nekomaid.Utils;
import co.aikar.timings.Timings;
import org.bukkit.scheduler.BukkitScheduler;
import org.bukkit.scheduler.BukkitTask;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;

public final class Profiler {
    private final NekoMaid main;
    private BukkitTask statusTimer, timingsTimer;
    private boolean started;
    private static boolean isTimingsV2;
    private static boolean canGetData = true;
    private static final Runtime runtime = Runtime.getRuntime();
    private static final OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
    private Object lastTimingsData;

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
        main.onConnected(main, client -> {
            client.on("profiler:status", args -> {
                if (started = (boolean) args[0]) main.GLOBAL_DATA.put("profilerStarted", true);
                else main.GLOBAL_DATA.remove("profilerStarted");
                main.broadcast(main, "profiler:status", started);
                checkTask();
            });
            if (isTimingsV2) client.onWithAck("profiler:timingsStatus", args -> {
                if (args.length == 2) {
                    Timings.setTimingsEnabled((boolean) args[0]);
                    if (!(boolean) args[0]) lastTimingsData = null;
                }
                if (lastTimingsData != null) client.emit("profiler:timings", lastTimingsData);
                return TimingsV2.isStarted();
            });
        });
    }

    private void checkTask() {
        if (started) {
            BukkitScheduler s = main.getServer().getScheduler();
            if (canGetData) try {
                OshiWrapper.class.getMethod("applyProfilerStatus", Status.class)
                        .invoke(null, new Status());
            } catch (Throwable ignored) { canGetData = false; }
            statusTimer = s.runTaskTimerAsynchronously(main, () -> {
                if (main.getClientsCountInPage(main, "profiler") == 0) return;
                Status status = new Status();
                status.tps = Utils.getTPS();
                status.mspt = Utils.getMSPT();
                status.cpu = os.getSystemLoadAverage();
                status.threads = Thread.activeCount();
                status.memory = runtime.totalMemory() - runtime.freeMemory();
                status.totalMemory = runtime.maxMemory();
                if (canGetData) try {
                    OshiWrapper.class.getMethod("applyProfilerStatus", Status.class).invoke(null, status);
                } catch (Throwable ignored) { canGetData = false; }
                main.broadcastInPage(main, "profiler", "profiler:current", status);
            }, 0, 5 * 20);
            if (isTimingsV2) {
                timingsTimer = s.runTaskTimerAsynchronously(main, () -> main.broadcastInPage(main, "profiler",
                        "profiler:timings", lastTimingsData = TimingsV2.exportData()), 30 * 20, 30 * 20);
            }
        } else {
            statusTimer.cancel();
            statusTimer = null;
            if (isTimingsV2) {
                timingsTimer.cancel();
                timingsTimer = null;
            }
        }
    }

    public static final class Status {
        public int threads;
        public long reads, writes, recv, sent;
        public double[] processorLoad;
        public double tps, mspt, cpu, memory, totalMemory, temperature;
    }
}
