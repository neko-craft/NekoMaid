package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import org.apache.commons.lang.ObjectUtils;
import org.bukkit.plugin.InvalidDescriptionException;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.PluginDescriptionFile;
import org.bukkit.plugin.SimplePluginManager;

import java.io.File;
import java.net.URLDecoder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;

final class Plugins {
    private final static class PluginInfo {
        public String name, description, author, version, website, file;
        public boolean enabled;
        @SuppressWarnings("unused")
        public PluginInfo() { }
        public PluginInfo(PluginDescriptionFile desc, String file, boolean enabled) {
            this(desc.getName(), desc.getDescription(), String.join(", ", desc.getAuthors()), desc.getVersion(),
                    desc.getWebsite(), file, enabled);
        }
        public PluginInfo(String name, String description, String author, String version, String website, String file,
                          boolean enabled) {
            this.name = name;
            this.description = description;
            this.version = version;
            this.author = author;
            this.website = website;
            this.file = file;
            this.enabled = enabled;
        }
    }
    public Plugins(NekoMaid main) {
        SimplePluginManager pm = (SimplePluginManager) main.getServer().getPluginManager();
        Path dir = ((File) ObjectUtils.defaultIfNull(pm.pluginsDirectory(), new File("plugins"))).toPath();
        main.onWithAck(main, "plugins:fetch", () -> {
            ArrayList<PluginInfo> list = new ArrayList<>();
            HashSet<Path> files = new HashSet<>();
            try {
                for (Plugin it : pm.getPlugins()) {
                    Path path = Paths.get(URLDecoder.decode(it.getClass().getProtectionDomain().getCodeSource()
                            .getLocation().getPath(), "UTF-8"));
                    PluginDescriptionFile desc = it.getDescription();
                    files.add(path);
                    list.add(new PluginInfo(desc, path.getFileName().toString(), it.isEnabled()));
                }
                Files.list(dir)
                        .filter(it -> (it.endsWith(".jar") || it.endsWith(".jar.disabled")) &&
                                Files.isRegularFile(it) && !files.contains(it))
                        .forEach(it -> {
                            try {
                                list.add(new PluginInfo(main.getPluginLoader().getPluginDescription(it.toFile()),
                                        it.getFileName().toString(), false));
                            } catch (InvalidDescriptionException ignored) { }
                        });
            } catch (Exception ignored) { }
            return list;
        });
    }
}
