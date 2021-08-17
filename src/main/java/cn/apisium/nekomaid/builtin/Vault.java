package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import net.milkbowl.vault.chat.Chat;
import net.milkbowl.vault.economy.Economy;
import net.milkbowl.vault.permission.Permission;
import org.bukkit.OfflinePlayer;
import org.bukkit.World;
import org.bukkit.plugin.RegisteredServiceProvider;
import org.bukkit.plugin.ServicesManager;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.stream.Stream;

final class Vault {
    private static final class PlayerInfo {
        public String id, prefix, suffix, group;
        public double balance;
    }
    private static final class GroupInfo { public String id, prefix, suffix; }
    @SuppressWarnings("deprecation")
    public Vault(NekoMaid main) {
        ServicesManager sm = main.getServer().getServicesManager();
        RegisteredServiceProvider<Economy> eco = sm.getRegistration(Economy.class);
        Economy econ = eco == null ? null : eco.getProvider();
        RegisteredServiceProvider<Permission> perm = sm.getRegistration(Permission.class);
        Permission permission = perm == null ? null : perm.getProvider();
        RegisteredServiceProvider<Chat> c = sm.getRegistration(Chat.class);
        Chat chat = c == null ? null : c.getProvider();

        main.GLOBAL_DATA.put("hasVault", true);
        if (econ != null && econ.isEnabled()) main.GLOBAL_DATA.put("vaultEconomy", new JSONObject()
                .put("singular", econ.currencyNameSingular())
                .put("plural", econ.currencyNamePlural())
                .put("digits", econ.fractionalDigits())
        );
        if (permission != null && permission.isEnabled()) {
            main.GLOBAL_DATA.put("hasVaultPermission", true);
            if (permission.hasGroupSupport()) main.GLOBAL_DATA.put("hasVaultGroups", true);
        }
        if (chat != null && chat.isEnabled()) main.GLOBAL_DATA.put("hasVaultChat", true);
        main.onConnected(main, client -> client.onWithMultiArgsAck("vault:fetch", args -> {
            try {
                OfflinePlayer[] arr = main.getServer().getOfflinePlayers();
                Stream<OfflinePlayer> stream = Arrays.stream(arr).filter(it -> it.getName() != null);
                if (args.length == 4) {
                    String name = (String) args[2];
                    // noinspection ConstantConditions
                    stream = stream.filter(it -> it.getName().toLowerCase().contains(name));
                }
                if (econ != null && args[1] != null) stream = "asc".equals(args[1])
                        ? stream.sorted((a, b) -> (int) (econ.getBalance(a) - econ.getBalance(b)))
                        : stream.sorted((a, b) -> (int) (econ.getBalance(b) - econ.getBalance(a)));
                int page = (int) args[0];
                return new Object[] {
                        arr.length,
                        stream.skip(page * 10).limit(10).map(it -> {
                            PlayerInfo info = new PlayerInfo();
                            info.id = it.getName();
                            if (econ != null && econ.isEnabled()) info.balance = econ.getBalance(it);
                            if (permission != null && permission.isEnabled() && permission.hasGroupSupport())
                                info.group = permission.getPrimaryGroup(null, it);
                            if (chat != null && chat.isEnabled()) {
                                info.prefix = chat.getPlayerPrefix(null, it);
                                info.suffix = chat.getPlayerSuffix(null, it);
                            }
                            return info;
                        }).toArray()
                };
            } catch (Throwable e) {
                e.printStackTrace();
                return null;
            }
        }).onWithAck("vault:setBalance", args -> {
            if (econ == null || !econ.isEnabled()) return false;
            String name = (String) args[0];
            double amount = ((Number) args[1]).doubleValue() - econ.getBalance(name);
            return (amount > 0 ? econ.depositPlayer(name, amount) : econ.withdrawPlayer(name, -amount)).transactionSuccess();
        }).onWithAck("vault:playerGroup", args -> { // name group action
            if (permission == null || !permission.isEnabled() || !permission.hasGroupSupport()) return false;
            try {
                String name = (String) args[0], group = (String) args[1];
                switch ((int) args[2]) {
                    case 0: return permission.getPlayerGroups((World) null, name);
                    case 1: return permission.playerAddGroup((World) null, name, group);
                    case 2: return permission.playerRemoveGroup((World) null, name, group);
                }
            } catch (Throwable ignored) { }
            return false;
        }).onWithAck("vault:setChat", args -> {
            if (chat == null || !chat.isEnabled()) return false;
            try {
                String name = (String) args[0], text = (String) args[3];
                if ((boolean) args[1]) {
                    if ((boolean) args[2]) chat.setGroupPrefix((World) null, name, text);
                    else chat.setGroupSuffix((World) null, name, text);
                } else {
                    if ((boolean) args[2]) chat.setPlayerPrefix((World) null, name, text);
                    else chat.setPlayerSuffix((World) null, name, text);
                }
                return true;
            } catch (Throwable ignored) {
                return false;
            }
        }).onWithAck("vault:fetchGroups", () -> {
            if (permission == null || !permission.isEnabled() || !permission.hasGroupSupport()) return null;
            String[] groups = permission.getGroups();
            GroupInfo[] arr = new GroupInfo[groups.length];
            int i = 0;
            for (String name : groups) {
                GroupInfo info = arr[i++] = new GroupInfo();
                info.id = name;
                if (chat == null || !chat.isEnabled()) continue;
                info.prefix = chat.getGroupPrefix((World) null, name);
                info.suffix = chat.getGroupSuffix((World) null, name);
            }
            return arr;
        }).onWithAck("vault:permission", args -> { // target, permission, action, isGroup
            if (permission == null || !permission.isEnabled()) return false;
            try {
                String name = (String) args[0], node = (String) args[1];
                int action = (int) args[2];
                if ((boolean) args[3]) {
                    if (permission.hasGroupSupport()) switch (action) {
                        case 0: return permission.groupHas((World) null, name, node);
                        case 1: return permission.groupAdd((World) null, name, node);
                        case 2: return permission.groupRemove((World) null, name, node);
                    }
                } else switch (action) {
                    case 0: return permission.playerHas((World) null, name, node);
                    case 1: return permission.playerAdd((World) null, name, node);
                    case 2: return permission.playerRemove((World) null, name, node);
                }
            } catch (Throwable ignored) { }
            return false;
        }).onWithAck("vault:getAllPermissions", () -> {
            final HashSet<String> set = new HashSet<>();
            for (org.bukkit.plugin.Plugin pl : main.getServer().getPluginManager().getPlugins()) {
                pl.getDescription().getPermissions().forEach(it -> set.add(it.getName()));
            }
            main.getServer().getPluginManager().getDefaultPermissions(true).forEach(it -> set.add(it.getName()));
            return set;
        }));
    }
}
