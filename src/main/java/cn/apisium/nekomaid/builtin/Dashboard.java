package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Room;
import cn.apisium.nekomaid.Utils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.EvictingQueue;
import org.bukkit.Bukkit;

import java.io.File;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Date;

@SuppressWarnings("UnstableApiUsage")
final class Dashboard {
    private final static Runtime runtime = Runtime.getRuntime();
    private final static long startTime = ManagementFactory.getRuntimeMXBean().getStartTime();
    private final EvictingQueue<Status> queue = EvictingQueue.create(24 * 3);
    private final ObjectMapper mapper = new ObjectMapper();
    private Status last;
    private CurrentStatus current;
    private Room room;

    private final static record Status(long time, int players, double tps, int entities, int chunks) { }
    private final static record CurrentStatus(String version, String[] players, double tps, double mspt, long time, int memory) { }

    @SuppressWarnings("deprecation")
    public Dashboard(NekoMaid main, File file) {
        try {
            if (!file.exists()) Files.writeString(file.toPath(), "[]");
            var arr = mapper.readValue(file, Status[].class);
            if (arr.length > 0) last = arr[arr.length - 1];
            queue.addAll(Arrays.asList(arr));
        } catch (Exception e) {
            e.printStackTrace();
        }
        var s = main.getServer();
        s.getScheduler().runTaskTimer(main, () -> {
            var time = new Date().getTime();
            if (last != null && last.time + 1000 * 60 * 55 > time) return;
            var entities = 0;
            var chunks = 0;
            for (var it : s.getWorlds()) {
                entities += it.getEntities().size();
                chunks += it.getLoadedChunks().length;
            }
            last = new Status(time, s.getOnlinePlayers().size(), Utils.getTPS(), entities, chunks);
            queue.add(last);
            try {
                mapper.writeValue(file, queue);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }, 0, 20 * 60 * 60);
        refresh();
        room = main.onWithAck(main, "dashboard:kick", String[].class, it -> {
            var p = main.getServer().getPlayerExact(it[0]);
            if (p == null) return false;
            main.getServer().getScheduler().runTask(main, () -> p.kickPlayer(it[1]));
            return true;
        }).onSwitchPage(main, "dashboard", it -> {
            if (room == null || room.getClients().size() == 1) refresh();
            it.emit("dashboard:info", queue).emit("dashboard:current", current);
        });
        s.getScheduler().runTaskTimerAsynchronously(main, () -> {
            if (room.getClients().isEmpty()) return;
            refresh();
            room.emit("dashboard:current", current);
        }, 0, 10 * 20);
    }

    private void refresh() {
        var list = Bukkit.getOnlinePlayers();
        var arr = new String[list.size()];
        var i = 0;
        for (var it : list) arr[i++] = it.getName();
        current = new CurrentStatus(Bukkit.getVersion(), arr, Utils.getTPS(), Utils.getMSPT(), startTime,
                (int) (((runtime.totalMemory() - runtime.freeMemory()) / (double) runtime.maxMemory()) * 100));
    }
}
