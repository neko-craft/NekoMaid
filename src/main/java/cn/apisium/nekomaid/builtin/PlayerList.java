package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.utils.Utils;
import org.apache.commons.lang.ObjectUtils;
import org.bukkit.*;
import org.bukkit.entity.Player;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class PlayerList {
    private static Statistic PLAY_ON_TICK;
    private static boolean canAssessOfflinePlayer;
    static {
        try {
            PLAY_ON_TICK = Statistic.PLAY_ONE_MINUTE;
        } catch (Throwable ignored) {
            try { PLAY_ON_TICK = Statistic.valueOf("PLAY_ONE_TICK"); } catch (Throwable ignored2) { }
        }
        try {
            OfflinePlayer.class.getMethod("getStatistic", Statistic.class);
            OfflinePlayer.class.getMethod("getStatistic", Statistic.class, Material.class);
            canAssessOfflinePlayer = true;
        } catch (Throwable ignored) { }
    }
    private PlayerList() { }
    private static final class PlayerData2 {
        public String id, ban;
        public boolean whitelisted, hasPlayedBefore, isOP;
        public int playTime, death, quit, playerKill, entityKill, tnt;
        public long lastOnline, firstPlay;
    }
    private static final class PlayerData {
        public String name, ban;
        public boolean whitelisted, online;
        public int playTime;
        public long lastOnline;
    }
    private static final class List {
        public long count;
        public Object[] players;

        @SuppressWarnings("unused")
        public List() { }
        public List(long a, Object[] c) {
            count = a;
            players = c;
        }
    }
    @SuppressWarnings({"deprecation", "ConstantConditions"})
    public static void init(NekoMaid main) {
        Server server = main.getServer();
        main.onConnected(main, client -> client.onWithAck("playerList:fetchPage", args -> {
            Stream<OfflinePlayer> list;
            int page = (int) args[0], state = (int) args[1];
            Set<OfflinePlayer> whiteList = server.getWhitelistedPlayers();
            BanList banList = server.getBanList(BanList.Type.NAME);
            int count;
            switch (state) {
                case 1:
                    list = whiteList.parallelStream();
                    count = whiteList.size();
                    break;
                case 2:
                    Set<BanEntry> entries = banList.getBanEntries();
                    list = entries.parallelStream().map(it -> server.getOfflinePlayer(it.getTarget()));
                    count = entries.size();
                    break;
                default:
                    OfflinePlayer[] players = server.getOfflinePlayers();
                    count = players.length;
                    list = Arrays.stream(players).parallel();
            }
            String filter = (String) args[2];
            if (filter == null) return new List(count, mapPlayersToObject(page, whiteList, banList, list));
            java.util.List<OfflinePlayer> copy = list.filter(p -> p.getName() != null && p.getName().toLowerCase()
                    .contains(filter)).collect(Collectors.toList());
            return new List(copy.size(), mapPlayersToObject(page, whiteList, banList, copy.stream()));
        }).on("playerList:ban", it -> {
            try {
                String msg = ((String) it[1]).isEmpty() ? null : (String) it[1];
                main.getServer().getBanList(BanList.Type.NAME).addBan((String) it[0], msg, null, "NekoMaid").save();
                Player p = Bukkit.getPlayerExact((String) it[0]);
                if (p != null) p.kickPlayer(msg);
                main.getLogger().info("Banned " + it[0] + ": " + (msg == null ? "" : msg));
            } catch (Throwable e) {
                e.printStackTrace();
            }
        }).on("playerList:pardon", it -> {
            main.getServer().getBanList(BanList.Type.NAME).pardon((String) it[0]);
            main.getLogger().info("Unbanned " + it[0]);
        }).on("playerList:addWhitelist", it -> {
            main.getServer().getOfflinePlayer((String) it[0]).setWhitelisted(true);
            main.getLogger().info("Added " + it[0] + " to the whitelist");
        }).on("playerList:removeWhitelist", it -> {
            main.getServer().getOfflinePlayer((String) it[0]).setWhitelisted(false);
            main.getLogger().info("Removed " + it[0] + " from the whitelist");
        }).onWithAck("playerList:query", it -> {
            OfflinePlayer p = main.getServer().getOfflinePlayer((String) it[0]);
            BanEntry ban = main.getServer().getBanList(BanList.Type.NAME).getBanEntry((String) it[0]);
            PlayerData2 d = new PlayerData2();
            d.id = p.getUniqueId().toString();
            if (ban != null) d.ban = ban.getReason();
            d.whitelisted = p.isWhitelisted();
            d.lastOnline = Utils.getPlayerLastPlayTime(p);
            d.hasPlayedBefore = p.hasPlayedBefore();
            d.firstPlay = p.getFirstPlayed();
            d.isOP = p.isOp();
            d.playTime = getPlayerTime(p);
            if (canAssessOfflinePlayer) {
                d.death = p.getStatistic(Statistic.DEATHS);
                d.quit = p.getStatistic(Statistic.LEAVE_GAME);
                d.playerKill = p.getStatistic(Statistic.PLAYER_KILLS);
                d.entityKill =  p.getStatistic(Statistic.MOB_KILLS);
                d.tnt = p.getStatistic(Statistic.USE_ITEM, Material.TNT);
            } else if (p.isOnline()) {
                Player p1 = p.getPlayer();
                d.death = p1.getStatistic(Statistic.DEATHS);
                d.quit = p1.getStatistic(Statistic.LEAVE_GAME);
                d.playerKill = p1.getStatistic(Statistic.PLAYER_KILLS);
                d.entityKill =  p1.getStatistic(Statistic.MOB_KILLS);
                d.tnt = p1.getStatistic(Statistic.USE_ITEM, Material.TNT);
            }
            return d;
        }));
    }

    @SuppressWarnings("ConstantConditions")
    private static int getPlayerTime(OfflinePlayer p) {
        return p.isOnline() ? p.getPlayer().getStatistic(PLAY_ON_TICK) : canAssessOfflinePlayer
                ? p.getStatistic(PLAY_ON_TICK) : 0;
    }

    private static Object[] mapPlayersToObject(int page, Set<OfflinePlayer> whiteList,
                                               BanList banList, Stream<OfflinePlayer> list) {
        return list.skip(page * 10L).limit(10).map(p -> {
            String ban = null, name = p.getName();
            if (name != null) {
                BanEntry be = banList.getBanEntry(name);
                if (be != null) ban = (String) ObjectUtils.defaultIfNull(be.getReason(), "Banned by " +
                        be.getTarget() + "!");
            }
            PlayerData pd = new PlayerData();
            pd.online = p.isOnline();
            pd.name = p.getName();
            pd.ban = ban;
            pd.whitelisted = whiteList.contains(p);
            pd.playTime = getPlayerTime(p);
            pd.lastOnline = Utils.getPlayerLastPlayTime(p);
            return pd;
        }).toArray();
    }
}
