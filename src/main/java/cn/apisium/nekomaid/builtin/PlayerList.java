package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import org.bukkit.BanList;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.Statistic;

import java.util.Arrays;
import java.util.Objects;

final class PlayerList {
    private static final record PlayerData(String name, String ban, boolean whitelisted, int playTime, long lastOnline) { }
    private static final record List(int count, boolean hasWhitelist, PlayerData[] players) { }
    private static final record Fetch(int state, int page) { }
    @SuppressWarnings({"deprecation"})
    public PlayerList(NekoMaid main) {
        main.onWithAck(main, "playerList:fetchPage", Fetch.class, it -> {
            var list = main.getServer().getOfflinePlayers();
            if (it.state != 0) list = Arrays.stream(list)
                    .filter(it.state == 1 ? OfflinePlayer::isWhitelisted : OfflinePlayer::isBanned)
                    .toArray(OfflinePlayer[]::new);
            int start = it.page * 10;
            if (start >= list.length) return new List(0, Bukkit.hasWhitelist(), null);
            int end = Math.min(start + 10, list.length);
            var res = new PlayerData[end - start];
            for (int i = 0; start < end; start++, i++) {
                var p = list[start];
                String ban = null;
                var be = Bukkit.getBanList(BanList.Type.NAME).getBanEntry(Objects.requireNonNull(p.getName()));
                if (be != null) ban = be.getReason();
                res[i] = new PlayerData(p.getName(), ban, p.isWhitelisted(),
                        p.getStatistic(Statistic.PLAY_ONE_MINUTE), Utils.getPlayerLastPlayTime(p));
            }
            return new List(list.length, Bukkit.hasWhitelist(), res);
        }).on(main, "playerList:ban", String[].class, it -> {
            var msg = it[1].isEmpty() ? null : it[1];
            Bukkit.getBanList(BanList.Type.NAME).addBan(it[0], msg, null, "NekoMaid");
            var p = Bukkit.getPlayer(it[0]);
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
        });
    }
}
