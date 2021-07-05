package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;

class FilesManager {
    private final static long MAX_SIZE = 4 * 1024 * 1024;
    private final static Path root = Paths.get(".");
    public FilesManager(NekoMaid main) {
        main.onWithAck(main, "files:fetch", String.class, path -> {
            try {
                Path p = Paths.get(".", path);
                if (!p.startsWith(root) || !Files.isDirectory(p) || Files.isHidden(p)) return null;
                ArrayList<String> dirs = new ArrayList<>(), files = new ArrayList<>();
                Files.list(p).forEach(it -> (Files.isDirectory(it) ? dirs : files).add(it.getFileName().toString()));
                return new ArrayList[] { dirs, files };
            } catch (IOException e) {
                return null;
            }
        }).onWithAck(main, "files:content", String.class, path -> {
            try {
                Path p = Paths.get(".", path);
                if (!p.startsWith(root) || Files.isHidden(p) || !Files.isReadable(p)) return 0;
                if (!Files.isRegularFile(p)) return 1;
                if (Files.size(p) > MAX_SIZE) return 2;
                return new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            } catch (IOException e) {
                return null;
            }
        }).onWithAck(main, "files:update", String[].class, args -> {
            try {
                if (args.length < 1) return null;
                Path p = Paths.get(".", args[0]);
                if (!p.startsWith(root) || Files.isHidden(p)) return false;
                if (args.length == 1) {
                    if (!Files.exists(p)) return true;
                    Files.walkFileTree(p, new SimpleFileVisitor<Path>() {
                        @Override
                        public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                            Files.delete(file);
                            return FileVisitResult.CONTINUE;
                        }
                        @Override
                        public FileVisitResult postVisitDirectory(Path dir, IOException e) throws IOException {
                            if (e == null) {
                                Files.delete(dir);
                                return FileVisitResult.CONTINUE;
                            } else throw e;
                        }
                    });
                } else if (args[1] != null && Files.isRegularFile(p)) {
                    Files.write(p, args[1].getBytes(StandardCharsets.UTF_8));
                } else return false;
                return true;
            } catch (IOException e) {
                return false;
            }
        });
    }
}
