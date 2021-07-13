package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;

final class FilesManager {
    private final static long MAX_SIZE = 4 * 1024 * 1024;
    private final static Path root = Paths.get(".");
    private FilesManager() { }
    public static void createFilesManager(NekoMaid main) {
        main.onConnected(main, client -> client.onWithAck("files:fetch", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root) || !Files.isDirectory(p) || Files.isHidden(p)) return null;
                ArrayList<String> dirs = new ArrayList<>(), files = new ArrayList<>();
                Files.list(p).forEach(it -> (Files.isDirectory(it) ? dirs : files).add(it.getFileName().toString()));
                return new ArrayList[] { dirs, files };
            } catch (IOException e) {
                return null;
            }
        }).onWithAck("files:content", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root)) return 0;
                if (!Files.exists(p)) return 1;
                if (Files.isDirectory(p)) return 2;
                if (Files.isHidden(p) || !Files.isReadable(p) || !Files.isRegularFile(p)) return 0;
                if (Files.size(p) > MAX_SIZE) return 3;
                return new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            } catch (IOException e) {
                return null;
            }
        }).onWithAck("files:update", args -> {
            try {
                if (args.length != 2 && args.length != 3) return null;
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root)) return false;
                if (args.length == 2) {
                    if (Files.isHidden(p)) return false;
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
                } else if (args[1] != null && !Files.isDirectory(p)) {
                    Files.write(p, ((String) args[1]).getBytes(StandardCharsets.UTF_8));
                } else return false;
                return true;
            } catch (IOException ignored) { return false; }
        }).onWithAck("files:createDirectory", args -> {
            Path p = Paths.get(".", (String) args[0]);
            if (!p.startsWith(root) || Files.exists(p)) return false;
            try {
                Files.createDirectory(p);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }).onWithAck("files:rename", args -> {
            if (args.length != 3) return false;
            Path p0 = Paths.get(".", (String) args[0]), p1 = Paths.get(".", (String) args[1]);
            if (!p0.startsWith(root) || !Files.exists(p0)) return false;
            try {
                if (Files.isSameFile(p0, p1) || Files.isSameFile(root, p1) || Files.isSameFile(root, p0)) return false;
                Files.move(p0, p1);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }));
    }
}
