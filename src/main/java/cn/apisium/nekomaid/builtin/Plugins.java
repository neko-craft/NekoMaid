package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import com.rylinaux.plugman.util.PluginUtil;
import org.apache.commons.lang.ObjectUtils;
import org.bukkit.Bukkit;
import org.bukkit.plugin.*;

import java.io.File;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;

final class Plugins {
    private final static boolean HAS_PLUGMAN;
    private final static SimplePluginManager pm = (SimplePluginManager) Bukkit.getPluginManager();
    private final static Path pluginsDir = ((File) ObjectUtils.defaultIfNull(pm.pluginsDirectory(),
            new File("plugins"))).toPath();

    private final NekoMaid main;

    static {
        boolean flag = false;
        try {
            Class.forName("com.rylinaux.plugman.util.PluginUtil");
            flag = true;
        } catch (Exception ignored) { }
        HAS_PLUGMAN = flag;
    }

    private final static class PluginInfo {
        public String name, description, author, version, website, file;
        public boolean enabled, loaded;
        @SuppressWarnings("unused")
        public PluginInfo() { }
        public PluginInfo(PluginDescriptionFile desc, String file, boolean enabled, boolean loaded) {
            this(desc.getName(), desc.getDescription(), String.join(", ", desc.getAuthors()), desc.getVersion(),
                    desc.getWebsite(), file, enabled, loaded);
        }
        public PluginInfo(String name, String description, String author, String version, String website, String file,
                          boolean enabled, boolean loaded) {
            this.name = name;
            this.description = description;
            this.version = version;
            this.author = author;
            this.website = website;
            this.file = file;
            this.enabled = enabled;
            this.loaded = loaded;
        }
    }
    private final static class PluginsInfo {
        public ArrayList<PluginInfo> plugins;
        public boolean canLoadPlugin;
    }
    public Plugins(NekoMaid main) {
        this.main = main;
        main.onConnected(main, client -> client.onWithAck("plugins:fetch", () -> {
            ArrayList<PluginInfo> list = new ArrayList<>();
            HashSet<Path> files = new HashSet<>();
            try {
                for (Plugin it : pm.getPlugins()) {
                    Path path = Paths.get(URLDecoder.decode(it.getClass().getProtectionDomain().getCodeSource()
                            .getLocation().getPath(), "UTF-8"));
                    PluginDescriptionFile desc = it.getDescription();
                    files.add(path);
                    list.add(new PluginInfo(desc, path.getFileName().toString(), it.isEnabled(), true));
                }
                Files.list(pluginsDir)
                        .filter(it -> (it.endsWith(".jar") || it.endsWith(".jar.disabled")) &&
                                Files.isRegularFile(it) && !files.contains(it))
                        .forEach(it -> {
                            try {
                                list.add(new PluginInfo(main.getPluginLoader().getPluginDescription(it.toFile()),
                                        it.getFileName().toString(), false, false));
                            } catch (InvalidDescriptionException ignored) { }
                        });
            } catch (Exception ignored) { }
            PluginsInfo info = new PluginsInfo();
            info.plugins = list;
            info.canLoadPlugin = HAS_PLUGMAN;
            return info;
        }).onWithAck("files:enable", it -> {
            Plugin p = Bukkit.getPluginManager().getPlugin((String) it[0]);
            if (p == null) return false;
            if (p.isEnabled()) pm.disablePlugin(p);
            else pm.enablePlugin(p);
            return true;
        }).onWithAck("files:disableForever", args -> {
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
                return true;
            } catch (Exception ignored) { return false; }
        }).onWithAck("files:load", args -> {
            if (!HAS_PLUGMAN) return false;
            try {
                String it = (String) args[0];
                Plugin pl = getPlugin(it);
                if (pl == null) PluginUtil.load(it);
                else PluginUtil.unload(pl);
                return true;
            } catch (Exception ignored) { return false; }
        }).onWithAck("files:delete", args -> {
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
                }
                Files.delete(file);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }));
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
}
