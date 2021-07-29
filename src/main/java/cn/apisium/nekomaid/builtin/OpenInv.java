package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.ItemData;
import cn.apisium.nekomaid.NekoMaid;
import com.lishid.openinv.IOpenInv;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.Plugin;

import java.util.Arrays;
import java.util.Collections;

final class OpenInv {
    private boolean hasOpenInv;
    public OpenInv(NekoMaid main) {
        Plugin plugin = main.getServer().getPluginManager().getPlugin("OpenInv");
        if (plugin != null) {
            hasOpenInv = true;
            main.GLOBAL_DATA.put("hasOpenInv", true);
        }
        main.onConnected(main, client -> client.onWithAck("openInv:fetchInv", args -> {
            Player player = getPlayer((String) args[0]);
            if (player == null) return Collections.emptyList();
            Object items = getInventoryItems(player.getInventory());
            unloadPlayer(player);
            return items;
        }).onWithAck("openInv:fetchEnderChest", args -> {
            Player player = getPlayer((String) args[0]);
            if (player == null) return Collections.emptyList();
            Object items = getInventoryItems(player.getEnderChest());
            unloadPlayer(player);
            return items;
        }).onWithAck("openInv:remove", args -> {
            Player player = getPlayer((String) args[1]);
            if (player == null) return false;
            Inventory inv = "PLAYER".equals(args[0]) ? player.getInventory() : player.getEnderChest();
            inv.setItem((int) args[2], null);
            if (player.isOnline()) main.getServer().getScheduler().runTask(main, player::updateInventory);
            else player.saveData();
            unloadPlayer(player);
            return true;
        }).onWithAck("openInv:set", args -> {
            Player player = getPlayer((String) args[1]);
            if (player == null) return false;
            Inventory inv = "PLAYER".equals(args[0]) ? player.getInventory() : player.getEnderChest();
            try {
                ItemStack is = inv.getItem((int) args[2]);
                inv.setItem((int) args[2], ItemData.fromString((String) args[3]).getItemStack());
                int it = (int) args[4];
                if (it != -1 && is != null) inv.setItem((int) args[2], is);
                if (player.isOnline()) main.getServer().getScheduler().runTask(main, player::updateInventory);
                else player.saveData();
            } catch (Exception e) {
                e.printStackTrace();
            }
            unloadPlayer(player);
            return true;
        }));
    }

    private Object getInventoryItems(Inventory inv) {
        return inv == null ? null : Arrays.stream(inv.getContents())
                .map(it -> it == null || it.getType() == Material.AIR ? null : new ItemData(it)).toArray();
    }

    @SuppressWarnings({"deprecation", "ConstantConditions"})
    private Player getPlayer(String name) {
        OfflinePlayer player = Bukkit.getOfflinePlayer(name);
        if (!player.hasPlayedBefore()) return null;
        return player.isOnline() ? player.getPlayer() : hasOpenInv
                ? ((IOpenInv) Bukkit.getPluginManager().getPlugin("OpenInv")).loadPlayer(player) : null;
    }

    @SuppressWarnings("ConstantConditions")
    private void unloadPlayer(OfflinePlayer player) {
        if (player != null && !player.isOnline() && hasOpenInv)
            ((IOpenInv) Bukkit.getPluginManager().getPlugin("OpenInv")).unload(player);
    }
}
