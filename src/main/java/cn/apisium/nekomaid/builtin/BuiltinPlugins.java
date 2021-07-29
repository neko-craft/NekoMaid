package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import org.bukkit.plugin.PluginManager;

public final class BuiltinPlugins {
    private final Console console;
    private final FilesManager files;
    private Scheduler scheduler;
    public BuiltinPlugins(NekoMaid main) {
        new Dashboard(main);
        console = new Console(main);
        PlayerList.initPlayerList(main);
        files = new FilesManager(main);
        main.getServer().getScheduler().runTask(main, () -> {
            new Plugins(main);
            scheduler = new Scheduler(main);
            PluginManager pm = main.getServer().getPluginManager();
            if (pm.getPlugin("Vault") != null) new Vault(main);
            new OpenInv(main);
            if (pm.getPlugin("NBTAPI") != null) ItemEditor.initItemEditor(main);
        });
    }
    public void disable() {
        console.stop();
        files.disable();
        if (scheduler != null) scheduler.stop();
    }
}
