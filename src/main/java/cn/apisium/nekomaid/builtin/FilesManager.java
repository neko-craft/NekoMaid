package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;

class FilesManager {
    private final static Path root = Paths.get(".");
    public FilesManager(NekoMaid main) {
        main.onWithAck(main, "files:fetch", String.class, path -> {
            var p = Paths.get(".", path);
            if (!p.startsWith(root) || !Files.isDirectory(p)) return null;
            try {
                var dirs = new ArrayList<String>();
                var files = new ArrayList<String>();
                Files.list(p).forEach(it -> (Files.isDirectory(it) ? dirs : files).add(it.getFileName().toString()));
                return new ArrayList[] { dirs, files };
            } catch (IOException e) {
                return null;
            }
        });
    }
}
