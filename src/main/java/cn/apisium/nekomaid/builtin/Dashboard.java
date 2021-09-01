package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.utils.Utils;
import com.google.common.collect.EvictingQueue;
import com.google.gson.Gson;
import com.maxmind.geoip2.model.CityResponse;
import org.bukkit.Bukkit;
import org.bukkit.Server;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;

import java.io.File;
import java.lang.management.ManagementFactory;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@SuppressWarnings("UnstableApiUsage")
final class Dashboard implements Listener {
    private final static Runtime runtime = Runtime.getRuntime();
    private final static long startTime = ManagementFactory.getRuntimeMXBean().getStartTime();
    private final EvictingQueue<Status> queue = EvictingQueue.create(24 * 3);
    private final NekoMaid main;
    private Status last;
    private CurrentStatus current;
    private long lastCheckVersion;
    private int behindVersions = -3;
    private final WeakHashMap<Player, double[]> ipCache = new WeakHashMap<>();
    private static boolean canGetPing;

    static {
        try {
            Player.class.getMethod("getPing");
            canGetPing = true;
        } catch (Throwable ignored) { }
    }

    private final static class Status {
        public long time;
        public int players;
        public double tps;
        public int entities;
        public int chunks;
    }
    private final static class PlayerInfo {
        public String name, ip;
        public int ping;
        public double[] loc;
    }
    private final static class CurrentStatus {
        public PlayerInfo[] players;
        public double tps, mspt;
        public long time, memory, totalMemory;
        public int behinds;
    }

    @SuppressWarnings("deprecation")
    public Dashboard(NekoMaid main) {
        this.main = main;
        Path file = new File(main.getDataFolder(), "status.json").toPath();
        try {
            if (!Files.exists(file)) Files.write(file, "[]".getBytes(StandardCharsets.UTF_8));
            Status[] arr = new Gson().fromJson(Files.newBufferedReader(file), Status[].class);
            if (arr != null) {
                if (arr.length > 0) last = arr[arr.length - 1];
                queue.addAll(Arrays.asList(arr));
            }
        } catch (Throwable e) {
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
            } catch (Throwable e) {
                e.printStackTrace();
            }
        }, 0, 20 * 60 * 60);
        main.onSwitchPage(main, "dashboard", it -> {
            if (main.getClientsCountInPage(main, "dashboard") != 0) refresh();
            it.emit("dashboard:info", queue).emit("dashboard:current", current);
            long time = new Date().getTime();
            if (lastCheckVersion + 12 * 60 * 60 * 1000 < time) {
                lastCheckVersion = time;
                checkUpdate();
            }
        }).onConnected(main, client -> client.onWithAck("dashboard:kick", args -> {
            Player p = main.getServer().getPlayerExact((String) args[0]);
            if (p == null) return false;
            main.getServer().getScheduler().runTask(main, () -> p.kickPlayer((String) args[1]));
            return true;
        }).onWithAck("dashborad:checkUpdate", this::checkUpdate));
        s.getScheduler().runTaskTimerAsynchronously(main, () -> {
            if (main.getClientsCountInPage(main, "dashboard") == 0) return;
            refresh();
            main.broadcastInPage(main, "dashboard", "dashboard:current", current);
        }, 0, 10 * 20);
        s.getScheduler().runTaskAsynchronously(main, this::refresh);
        s.getPluginManager().registerEvents(this, main);
    }

    private void refresh() {
        Collection<? extends Player> list = Bukkit.getOnlinePlayers();
        PlayerInfo[] arr = new PlayerInfo[list.size()];
        int i = 0;
        for (Player p : list) {
            PlayerInfo it = arr[i++] = new PlayerInfo();
            it.name = p.getName();
            if (canGetPing) it.ping = p.getPing();
            if (p.getAddress() != null) {
                InetSocketAddress ip = p.getAddress();
                it.ip = ip.getHostString();
                if (main.getGeoIP().isAvailable())
                    it.loc = ipCache.computeIfAbsent(p, q -> {
                        CityResponse city = main.getGeoIP().queryCity(ip.getAddress());
                        return city == null ? null : new double[] {
                                city.getLocation().getLongitude(),
                                city.getLocation().getLatitude()
                        };
                    });
            }
        }
        Arrays.sort(arr, Comparator.comparing(a -> a.name));
        current = new CurrentStatus();
        current.players = arr;
        current.tps = Utils.getTPS();
        current.mspt = Utils.getMSPT();
        current.time = startTime;
        current.memory = runtime.totalMemory() - runtime.freeMemory();
        current.totalMemory = runtime.maxMemory();
        current.behinds = behindVersions;
    }

    private void checkUpdate() {
        main.getServer().getScheduler().runTaskAsynchronously(main, () -> {
            behindVersions = Utils.checkUpdate();
            lastCheckVersion = new Date().getTime();
            if (main.getClientsCountInPage(main, "dashboard") == 0) return;
            refresh();
            main.broadcastInPage(main, "dashboard", "dashboard:current", current);
        });
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) { ipCache.remove(e.getPlayer()); }
}
