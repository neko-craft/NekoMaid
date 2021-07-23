package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import org.bukkit.*;
import org.bukkit.entity.Player;

import java.util.Arrays;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class PlayerList {
    private PlayerList() { }
    private static final class PlayerData2 {
        public String id, ban;
        public boolean whitelisted, hasPlayedBefore, isOP;
        public int playTime, death, quit, playerKill, entityKill, tnt;
        public long lastOnline, firstPlay;
    }
    private static final class PlayerData {
        public String name, ban;
        public boolean whitelisted;
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
    @SuppressWarnings({"deprecation"})
    public static void initPlayerList(NekoMaid main) {
        main.onConnected(main, client -> client.onWithAck("playerList:fetchPage", args -> {
            Stream<OfflinePlayer> list = Arrays.stream(main.getServer().getOfflinePlayers());
            int page = (int) args[0], state = (int) args[1];
            String filter = (String) args[2];
            if (state != 0 || filter != null) {
                if (state == 1) list = list.filter(OfflinePlayer::isWhitelisted);
                else if (state == 2) list = list.filter(OfflinePlayer::isBanned);
                if (filter != null) list = list.filter(p -> p.getName() != null && p.getName().toLowerCase().contains(filter));
            }
            java.util.List<OfflinePlayer> newList = list.collect(Collectors.toList());
            BanList banList = Bukkit.getBanList(BanList.Type.NAME);
            return new List(newList.size(), newList.stream().skip(page * 10L).limit(10).map(p -> {
                String ban = null;
                BanEntry be = banList.getBanEntry(Objects.requireNonNull(p.getName()));
                if (be != null) ban = be.getReason();
                PlayerData pd = new PlayerData();
                pd.name = p.getName();
                pd.ban = ban;
                pd.whitelisted = p.isWhitelisted();
                pd.playTime = p.getStatistic(Statistic.PLAY_ONE_MINUTE);
                pd.lastOnline = Utils.getPlayerLastPlayTime(p);
                return pd;
            }).toArray());
        }).on("playerList:ban", it -> {
            String msg = ((String) it[1]).isEmpty() ? null : (String) it[1];
            Bukkit.getBanList(BanList.Type.NAME).addBan((String) it[0], msg, null, "NekoMaid");
            Player p = Bukkit.getPlayerExact((String) it[0]);
            if (p != null) p.kickPlayer(msg);
            main.getLogger().info("Banned " + it[0] + ": " + (msg == null ? "" : msg));
        }).on("playerList:pardon", it -> {
            Bukkit.getBanList(BanList.Type.NAME).pardon((String) it[0]);
            main.getLogger().info("Unbanned " + it[0]);
        }).on("playerList:addWhitelist", it -> {
            Bukkit.getOfflinePlayer((String) it[0]).setWhitelisted(true);
            main.getLogger().info("Added " + it[0] + " to the whitelist");
        }).on("playerList:removeWhitelist", it -> {
            Bukkit.getOfflinePlayer((String) it[0]).setWhitelisted(false);
            main.getLogger().info("Removed " + it[0] + " from the whitelist");
        }).onWithAck("playerList:query", it -> {
            OfflinePlayer p = Bukkit.getOfflinePlayer((String) it[0]);
            BanEntry ban = Bukkit.getBanList(BanList.Type.NAME).getBanEntry((String) it[0]);
            PlayerData2 d = new PlayerData2();
            d.id = p.getUniqueId().toString();
            if (ban != null) d.ban = ban.getReason();
            d.whitelisted = p.isWhitelisted();
            d.playTime = p.getStatistic(Statistic.PLAY_ONE_MINUTE);
            d.lastOnline = Utils.getPlayerLastPlayTime(p);
            d.hasPlayedBefore = p.hasPlayedBefore();
            d.firstPlay = p.getFirstPlayed();
            d.isOP = p.isOp();
            d.death = p.getStatistic(Statistic.DEATHS);
            d.quit = p.getStatistic(Statistic.LEAVE_GAME);
            d.playerKill = p.getStatistic(Statistic.PLAYER_KILLS);
            d.entityKill =  p.getStatistic(Statistic.MOB_KILLS);
            d.tnt = p.getStatistic(Statistic.USE_ITEM, Material.TNT);
            return d;
        }));
    }
}
