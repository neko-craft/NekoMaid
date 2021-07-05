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
    private static final class Fetch {
        public String filter;
        public int state, page;
    }
    @SuppressWarnings({"deprecation"})
    public PlayerList(NekoMaid main) {
        main.onWithAck(main, "playerList:fetchPage", Fetch.class, it -> {
            Stream<OfflinePlayer> list = Arrays.stream(main.getServer().getOfflinePlayers());
            if (it.state != 0 || it.filter != null) {
                if (it.state == 1) list = list.filter(OfflinePlayer::isWhitelisted);
                else if (it.state == 2) list = list.filter(OfflinePlayer::isBanned);
                if (it.filter != null) list = list.filter(p -> p.getName() != null && p.getName().contains(it.filter));
            }
            java.util.List<OfflinePlayer> newList = list.collect(Collectors.toList());
            BanList banList = Bukkit.getBanList(BanList.Type.NAME);
            return new List(newList.size(), newList.stream().skip(it.page * 10L).limit(10).map(p -> {
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
        }).on(main, "playerList:ban", String[].class, it -> {
            String msg = it[1].isEmpty() ? null : it[1];
            Bukkit.getBanList(BanList.Type.NAME).addBan(it[0], msg, null, "NekoMaid");
            Player p = Bukkit.getPlayerExact(it[0]);
            if (p != null) p.kickPlayer(msg);
            main.getLogger().info("Banned " + it[0] + ": " + (msg == null ? "" : msg));
        }).on(main, "playerList:pardon", String.class, it -> {
            Bukkit.getBanList(BanList.Type.NAME).pardon(it);
            main.getLogger().info("Unbanned " + it);
        }).on(main, "playerList:addWhitelist", String.class, it -> {
            Bukkit.getOfflinePlayer(it).setWhitelisted(true);
            main.getLogger().info("Added " + it + " to the whitelist");
        }).on(main, "playerList:removeWhitelist", String.class, it -> {
            Bukkit.getOfflinePlayer(it).setWhitelisted(false);
            main.getLogger().info("Removed " + it + " from the whitelist");
        }).onWithAck(main, "playerList:query", String.class, it -> {
            OfflinePlayer p = Bukkit.getOfflinePlayer(it);
            BanEntry ban = Bukkit.getBanList(BanList.Type.NAME).getBanEntry(it);
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
        });
    }
}
