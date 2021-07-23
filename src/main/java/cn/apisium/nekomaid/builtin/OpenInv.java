package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.ItemData;
import cn.apisium.nekomaid.NekoMaid;
import com.lishid.openinv.IOpenInv;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.inventory.Inventory;

import java.util.Arrays;

final class OpenInv {
    private final IOpenInv inv = (IOpenInv) Bukkit.getPluginManager().getPlugin("OpenInv");
    public OpenInv(NekoMaid main) {
        main.GLOBAL_DATA.put("hasOpenInv", true);
        main.onConnected(main, client -> client.onWithAck("openInv:fetchInv", args -> {
            Inventory inv = getInventory((String) args[0]);
            if (inv == null) return null;
            return Arrays.stream(inv.getContents()).map(it -> it == null || it.getType() == Material.AIR ? null
                    : new ItemData(it)).toArray();
        }).onWithAck("openInv:fetchEnderChest", args -> {
            Inventory inv = getEnderChest((String) args[0]);
            if (inv == null) return null;
            return Arrays.stream(inv.getContents()).map(it -> it == null || it.getType() == Material.AIR ? null
                    : new ItemData(it)).toArray();
        }));
    }

    @SuppressWarnings({"deprecation", "ConstantConditions"})
    private Inventory getInventory(String name) {
        try {
            OfflinePlayer player = Bukkit.getOfflinePlayer(name);
            if (!player.hasPlayedBefore()) return null;
            return inv.getSpecialInventory(player.isOnline() ? player.getPlayer() : inv.loadPlayer(player), player.isOnline())
                    .getBukkitInventory();
        } catch (InstantiationException e) { e.printStackTrace(); }
        return null;
    }

    @SuppressWarnings({"deprecation", "ConstantConditions"})
    private Inventory getEnderChest(String name) {
        try {
            OfflinePlayer player = Bukkit.getOfflinePlayer(name);
            if (!player.hasPlayedBefore()) return null;
            return inv.getSpecialEnderChest(player.isOnline() ? player.getPlayer() : inv.loadPlayer(player), player.isOnline())
                    .getBukkitInventory();
        } catch (InstantiationException e) { e.printStackTrace(); }
        return null;
    }
}
