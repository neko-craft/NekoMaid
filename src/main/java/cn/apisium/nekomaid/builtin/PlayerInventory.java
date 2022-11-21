package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.utils.ItemData;
import cn.apisium.nekomaid.NekoMaid;
import com.janboerman.invsee.spigot.InvseePlusPlus;
import com.janboerman.invsee.spigot.api.EnderSpectatorInventory;
import com.janboerman.invsee.spigot.api.InvseeAPI;
import com.janboerman.invsee.spigot.api.MainSpectatorInventory;
import com.janboerman.invsee.spigot.api.response.SpectateResponse;
import com.lishid.openinv.IOpenInv;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.Plugin;
import org.jetbrains.annotations.Nullable;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

final class PlayerInventory {
    private boolean hasOpenInv, hasInvSee;
    public PlayerInventory(NekoMaid main) {
        if (main.getServer().getPluginManager().getPlugin("OpenInv") == null) {
            Plugin plugin = main.getServer().getPluginManager().getPlugin("InvSeePlusPlus");
            if (plugin != null && ((InvseePlusPlus) plugin).offlinePlayerSupport()) {
                hasInvSee = true;
                main.GLOBAL_DATA.put("hasOfflineInventorySupport", true);
            }
        } else {
            hasOpenInv = true;
            main.GLOBAL_DATA.put("hasOfflineInventorySupport", true);
        }
        main.onConnected(main, client -> client.onWithAck("inventory:fetchInv", args -> {
            try (FakePlayer player = getFakePlayer((String) args[0])) {
                if (player != null) return getInventoryItems(player.getInventory());
            } catch (Throwable e) {
                e.printStackTrace();
            }
            return Collections.emptyList();
        }).onWithAck("inventory:fetchEnderChest", args -> {
            try (FakePlayer player = getFakePlayer((String) args[0])) {
                if (player != null) return getInventoryItems(player.getEnderChest());
            } catch (Throwable e) {
                e.printStackTrace();
            }
            return Collections.emptyList();
        }).onWithAck("inventory:set", args -> {
            try (FakePlayer player = getFakePlayer((String) args[1])) {
                if (player == null) return false;
                Inventory inv = "PLAYER".equals(args[0]) ? player.getInventory() : player.getEnderChest();
                try {
                    int to = (int) args[2], from = (int) args[4];
                    ItemStack is = inv.getItem(to);
                    String data = (String) args[3];
                    inv.setItem(to, data == null ? null : ItemData.fromString(data).getItemStack());
                    if (from != -1 && is != null) inv.setItem(from, is);
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return true;
            } catch (Throwable e) {
                e.printStackTrace();
                return false;
            }
        }));
    }

    @Nullable
    private Object getInventoryItems(Inventory inv) {
        return inv == null ? null : ItemData.fromInventory(inv);
    }

    @SuppressWarnings("deprecation")
    @Nullable
    private FakePlayer getFakePlayer(String name) {
        OfflinePlayer player = Bukkit.getOfflinePlayer(name);
        if (player.isOnline()) return new OnlinePlayer(player.getPlayer());
        if (!player.hasPlayedBefore()) return null;
        if (hasOpenInv) return new OpenInvPlayer(player);
        if (hasInvSee) return new InvSeePlayer(name);
        return null;
    }

    private interface FakePlayer extends AutoCloseable {
        Inventory getInventory() throws Throwable;
        Inventory getEnderChest() throws Throwable;
    }

    private static class OnlinePlayer implements FakePlayer {
        private final Player player;
        OnlinePlayer(Player player) { this.player = player; }
        @Override
        public Inventory getInventory() { return player.getInventory(); }
        @Override
        public Inventory getEnderChest() { return player.getEnderChest(); }
        @Override
        public void close() { NekoMaid.INSTANCE.getServer().getScheduler().runTask(NekoMaid.INSTANCE, player::updateInventory); }
    }

    private static class OpenInvPlayer implements FakePlayer {
        private final Player player;
        @SuppressWarnings("ConstantConditions")
        OpenInvPlayer(OfflinePlayer offlinePlayer) {
            player = ((IOpenInv) Bukkit.getPluginManager().getPlugin("OpenInv")).loadPlayer(offlinePlayer);
        }
        @Override
        public Inventory getInventory() { return player.getInventory(); }
        @Override
        public Inventory getEnderChest() { return player.getEnderChest(); }
        @Override
        public void close() { player.saveData(); }
    }

    private static class InvSeePlayer implements FakePlayer {
        private final InvseeAPI api;
        private final String name;
        private MainSpectatorInventory mainInv;
        private EnderSpectatorInventory enderInv;
        @SuppressWarnings("ConstantConditions")
        InvSeePlayer(String name) {
            this.name = name;
            api = ((InvseePlusPlus) Bukkit.getPluginManager().getPlugin("InvSeePlusPlus")).getApi();
        }
        @Override
        public Inventory getInventory() throws Throwable {
            SpectateResponse<MainSpectatorInventory> resp = api
                    .mainSpectatorInventory(name, "").get(30, TimeUnit.SECONDS);
            if (!resp.isSuccess()) return null;
            return mainInv = resp.getInventory();
        }
        @Override
        public Inventory getEnderChest() throws Throwable {
            SpectateResponse<EnderSpectatorInventory> resp = api
                    .enderSpectatorInventory(name, "").get(30, TimeUnit.SECONDS);
            if (!resp.isSuccess()) return null;
            return enderInv = resp.getInventory();
        }
        @Override
        public void close() {
            if (mainInv != null) api.saveInventory(mainInv);
            if (enderInv != null) api.saveEnderChest(enderInv);
        }
    }
}
