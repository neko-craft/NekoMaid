package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import net.milkbowl.vault.chat.Chat;
import net.milkbowl.vault.economy.Economy;
import net.milkbowl.vault.permission.Permission;
import org.bukkit.plugin.RegisteredServiceProvider;
import org.bukkit.plugin.ServicesManager;

final class Vault {
    public Vault(NekoMaid main) {
        ServicesManager sm = main.getServer().getServicesManager();
        RegisteredServiceProvider<Economy> eco = sm.getRegistration(Economy.class);
        Economy econ = eco == null ? null : eco.getProvider();
        RegisteredServiceProvider<Permission> perm = sm.getRegistration(Permission.class);
        Permission permission = perm == null ? null : perm.getProvider();
        RegisteredServiceProvider<Chat> c = sm.getRegistration(Chat.class);
        Chat chat = c == null ? null : c.getProvider();

        main.GLOBAL_DATA.put("hasVault", true);
    }
}
