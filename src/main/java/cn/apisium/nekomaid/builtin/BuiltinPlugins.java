package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;

import java.io.File;

public final class BuiltinPlugins {
    private final Console console;
    public BuiltinPlugins(NekoMaid main) {
        new Dashboard(main, new File(main.getDataFolder(), "status.json"));
        console = new Console(main);
        new PlayerList(main);
        new FilesManager(main);
    }
    public void disable() {
        console.stop();
    }
}
