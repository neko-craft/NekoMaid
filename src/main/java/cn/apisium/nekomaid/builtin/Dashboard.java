package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import com.google.common.collect.EvictingQueue;
import com.google.gson.Gson;
import org.bukkit.Bukkit;
import org.bukkit.Server;
import org.bukkit.World;
import org.bukkit.entity.Player;

import java.io.File;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;

@SuppressWarnings("UnstableApiUsage")
final class Dashboard {
    private final static Runtime runtime = Runtime.getRuntime();
    private final static long startTime = ManagementFactory.getRuntimeMXBean().getStartTime();
    private final EvictingQueue<Status> queue = EvictingQueue.create(24 * 3);
    private Status last;
    private CurrentStatus current;

    private final static class Status {
        public long time;
        public int players;
        public double tps;
        public int entities;
        public int chunks;
    }
    private final static class CurrentStatus {
        public String[] players;
        public double tps, mspt;
        public long time;
        public int memory;
    }

    @SuppressWarnings("deprecation")
    public Dashboard(NekoMaid main) {
        Path file = new File(main.getDataFolder(), "status.json").toPath();
        try {
            if (!Files.exists(file)) Files.write(file, "[]".getBytes(StandardCharsets.UTF_8));
            Status[] arr = new Gson().fromJson(Files.newBufferedReader(file), Status[].class);
            if (arr != null) {
                if (arr.length > 0) last = arr[arr.length - 1];
                queue.addAll(Arrays.asList(arr));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        Server s = main.getServer();
        s.getScheduler().runTaskTimer(main, () -> {
            long time = new Date().getTime();
            if (last != null && last.time + 1000 * 60 * 55 > time) return;
            int entities = 0;
            int chunks = 0;
            for (World it : s.getWorlds()) {
                entities += it.getEntities().size();
                chunks += it.getLoadedChunks().length;
            }
            last = new Status();
            last.time = time;
            last.players = s.getOnlinePlayers().size();
            last.tps = Utils.getTPS();
            last.entities = entities;
            last.chunks = chunks;
            queue.add(last);
            try {
                Files.write(file, new Gson().toJson(queue.toArray(), Status[].class).getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, 0, 20 * 60 * 60);
        refresh();
        main.onSwitchPage(main, "dashboard", it -> {
            if (main.getClientsCountInRoom("dashboard") != 0) refresh();
            it.emit("dashboard:info", queue).emit("dashboard:current", current);
        }).onConnected(main, client -> client.onWithAck("dashboard:kick", args -> {
            Player p = main.getServer().getPlayerExact((String) args[0]);
            if (p == null) return false;
            main.getServer().getScheduler().runTask(main, () -> p.kickPlayer((String) args[1]));
            return true;
        }));
        s.getScheduler().runTaskTimerAsynchronously(main, () -> {
            if (main.getClientsCountInRoom("dashboard") == 0) return;
            refresh();
            main.broadcast(main, "dashboard:current", "dashboard", current);
        }, 0, 10 * 20);
    }

    private void refresh() {
        Collection<? extends Player> list = Bukkit.getOnlinePlayers();
        String[] arr = new String[list.size()];
        int i = 0;
        for (Player it : list) arr[i++] = it.getName();
        current = new CurrentStatus();
        current.players = arr;
        current.tps = Utils.getTPS();
        current.mspt = Utils.getMSPT();
        current.time = startTime;
        current.memory = (int) (((runtime.totalMemory() - runtime.freeMemory()) / (double) runtime.maxMemory()) * 100);
    }
}
