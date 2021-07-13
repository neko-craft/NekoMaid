package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import com.rylinaux.plugman.util.PluginUtil;
import org.apache.commons.lang.ObjectUtils;
import org.bukkit.Bukkit;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.server.PluginDisableEvent;
import org.bukkit.event.server.PluginEnableEvent;
import org.bukkit.plugin.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;

final class Plugins implements Listener {
    private final static boolean HAS_PLUGMAN;
    private final static SimplePluginManager pm = (SimplePluginManager) Bukkit.getPluginManager();
    private final Path pluginsDir;

    private final NekoMaid main;

    static {
        boolean flag = false;
        try {
            Class.forName("com.rylinaux.plugman.util.PluginUtil");
            flag = true;
        } catch (Exception ignored) { }
        HAS_PLUGMAN = flag;
    }

    @SuppressWarnings({"MismatchedQueryAndUpdateOfCollection", "unused"})
    private final static class PluginInfo {
        public String name, description, author, version, website, file;
        public boolean enabled, loaded;
        public ArrayList<String> depends;
        public PluginInfo() { }
        public PluginInfo(PluginDescriptionFile desc, String file, boolean enabled, boolean loaded) {
            this.name = desc.getName();
            this.description = desc.getDescription();
            this.version = desc.getVersion();
            this.author = String.join(", ", desc.getAuthors());
            this.website = desc.getWebsite();
            this.file = file;
            this.enabled = enabled;
            this.loaded = loaded;
            this.depends = new ArrayList<>(desc.getDepend());
            depends.addAll(desc.getSoftDepend());

            if (author.length() > 50) author = author.substring(0, 49) + "...";
        }
    }

    public Plugins(NekoMaid main) {
        this.main = main;
        main.GLOBAL_DATA.put("canLoadPlugin", HAS_PLUGMAN);
        File dir;
        try {
            dir = (File) SimplePluginManager.class.getDeclaredField("pluginsDirectory").get(pm);
        } catch (Exception ignored) {
            dir = main.getDataFolder().getParentFile();
        }
        pluginsDir = ((File) ObjectUtils.defaultIfNull(dir, new File("plugins"))).toPath();
        main.onConnected(main, client -> client.on("plugins:fetch", () -> client.emit("plugins:list", getPluginsData()))
                .onWithAck("plugins:enable", args -> {
                    try {
                        String it = (String) args[0], name = it.replaceAll("\\.jar$", "");
                        Plugin pl = getPlugin(it);
                        if (pl == null) {
                            if (!HAS_PLUGMAN) return false;
                            PluginUtil.load(name);
                            return pm.getPlugin((String) args[1]) != null;
                        } else if (pm.isPluginEnabled(pl)) {
                            if (HAS_PLUGMAN) PluginUtil.unload(pl);
                            else pm.disablePlugin(pl);
                        } else {
                            if (HAS_PLUGMAN) PluginUtil.load(name);
                            else pm.enablePlugin(pl);
                        }
                        return true;
                    } catch (Exception ignored) { return false; }
                }).onWithAck("plugins:disableForever", args -> {
                    try {
                        String it = (String) args[0];
                        Path file = pluginsDir.resolve(it);
                        if (!file.startsWith(pluginsDir) || !Files.isRegularFile(file)) return false;
                        if (it.endsWith(".jar")) {
                            Plugin pl = getPlugin(it);
                            if (pl != null) {
                                if (!HAS_PLUGMAN) return false;
                                PluginUtil.unload(pl);
                            }
                            Files.move(file, pluginsDir.resolve(it + ".disabled"));
                        } else Files.move(file, pluginsDir.resolve(it.replaceAll("\\.disabled$", "")));
                        refresh();
                        return true;
                    } catch (Exception ignored) { return false; }
                }).onWithAck("plugins:delete", args -> {
                    try {
                        String it = (String) args[0];
                        Path file = pluginsDir.resolve(it);
                        if (!it.endsWith(".disabled") || !file.startsWith(pluginsDir) || !Files.isRegularFile(file)) return false;
                        Files.delete(file);
                        refresh();
                        return true;
                    } catch (Exception ignored) {
                        return false;
                    }
                })
        );
        main.getServer().getScheduler()
                .runTask(main, () -> main.getServer().getPluginManager().registerEvents(this, main));
    }

    private Plugin getPlugin(String it) throws Exception {
        Path file = pluginsDir.resolve(it);
        if (!file.startsWith(pluginsDir) || !Files.isRegularFile(file)) throw new IOException("This path is not a regular file!");
        if (it.endsWith(".disabled")) Files.move(file, pluginsDir.resolve(it.replaceAll("\\.disabled$", "")));
        if (!it.endsWith(".jar")) throw new IOException("This path is not a jar file!");
        File f = file.toFile();
        String name = main.getPluginLoader().getPluginDescription(f).getName();
        return pm.getPlugin(name);
    }

    private ArrayList<PluginInfo> getPluginsData() {
        ArrayList<PluginInfo> list = new ArrayList<>();
        HashSet<String> files = new HashSet<>();
        try {
            for (Plugin it : pm.getPlugins()) {
                Path path = Paths.get(it.getClass().getProtectionDomain().getCodeSource().getLocation().toURI());
                PluginDescriptionFile desc = it.getDescription();
                files.add(path.getFileName().toString());
                list.add(new PluginInfo(desc, path.getFileName().toString(), it.isEnabled(), true));
            }
            Files.list(pluginsDir)
                    .filter(it -> {
                        String fileName = it.getFileName().toString();
                        return (fileName.endsWith(".jar") || fileName.endsWith(".jar.disabled")) &&
                                 !files.contains(fileName) && Files.isRegularFile(it);
                    })
                    .forEach(it -> {
                        try {
                            list.add(new PluginInfo(main.getPluginLoader().getPluginDescription(it.toFile()),
                                    it.getFileName().toString(), false, false));
                        } catch (InvalidDescriptionException ignored) { }
                    });
        } catch (Exception e) { e.printStackTrace(); }
        return list;
    }

    private void refresh() {
        if (main.getClientsCountInPage(main, "plugins") == 0) return;
        main.getServer().getScheduler().runTaskLaterAsynchronously(main,
                () -> main.broadcastInPage(main, "plugins", "plugins:list", getPluginsData()), 2);
    }

    @EventHandler
    public void onPluginDisable(PluginDisableEvent e) { refresh(); }

    @EventHandler
    public void onPluginEnable(PluginEnableEvent e) { refresh(); }
}
