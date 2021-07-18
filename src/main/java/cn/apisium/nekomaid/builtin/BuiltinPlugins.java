package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;

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
            if (main.getServer().getPluginManager().getPlugin("Vault") != null) new Vault(main);
            if (main.getServer().getPluginManager().getPlugin("OpenInv") != null) new OpenInv(main);
        });
    }
    public void disable() {
        console.stop();
        files.disable();
        if (scheduler != null) scheduler.stop();
    }
}
