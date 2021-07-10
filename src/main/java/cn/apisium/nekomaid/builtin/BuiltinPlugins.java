package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;

public final class BuiltinPlugins {
    private final Console console;
    public BuiltinPlugins(NekoMaid main) {
        new Dashboard(main);
        console = new Console(main);
        PlayerList.initPlayerList(main);
        FilesManager.createFilesManager(main);
        main.getServer().getScheduler().runTask(main, () -> new Plugins(main));
    }
    public void disable() {
        console.stop();
    }
}
