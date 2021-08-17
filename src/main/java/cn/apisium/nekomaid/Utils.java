package cn.apisium.nekomaid;

import com.alibaba.fastjson.JSON;
import com.destroystokyo.paper.event.server.AsyncTabCompleteEvent;
import com.google.common.collect.ImmutableList;
import com.google.common.io.Resources;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.Server;
import org.bukkit.command.CommandMap;
import org.bukkit.command.defaults.VersionCommand;
import org.bukkit.event.server.TabCompleteEvent;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.concurrent.FutureTask;
import java.util.stream.StreamSupport;

@SuppressWarnings("deprecation")
public final class Utils {
    private static Class<?> paperVersionFetcherClass;
    private static String commitId, versionBranch = "master";
    private static final String versionInfo;
    private static CommandMap commandMap;
    private static boolean isTuinity, hasAsyncTabComplete, canGetLastLogin, canGetAverageTickTime, canGetTPS;
    private static Object server;
    private static Field recentTps, mspt;
    private static final String JSON_OBJECT = "\ud83c\udf7a";
    public static final boolean IS_PAPER;
    protected static boolean HAS_NBT_API;
    static {
        try {
            Class.forName("com.tuinity.tuinity.config.TuinityConfig");
            isTuinity = true;
        } catch (Throwable ignored) { }
        try {
            Class.forName("com.tuinity.tuinity.config.TuinityConfig");
            isTuinity = true;
        } catch (Throwable ignored) { }
        boolean isPaper = false;
        try {
            Class.forName("com.destroystokyo.paper.event.server.AsyncTabCompleteEvent");
            hasAsyncTabComplete = true;
            isPaper = true;
        } catch (Throwable ignored) { }
        IS_PAPER = isPaper;
        try {
            OfflinePlayer.class.getMethod("getLastLogin");
            canGetLastLogin = true;
        } catch (Throwable ignored) { }
        try {
            Bukkit.class.getMethod("getAverageTickTime");
            canGetAverageTickTime = true;
        } catch (Throwable ignored) { }
        try {
            Bukkit.class.getMethod("getTPS");
            canGetTPS = true;
        } catch (Throwable ignored) { }
        try {paperVersionFetcherClass = Class.forName("com.destroystokyo.paper.PaperVersionFetcher");} catch (Throwable ignored) {}
        try {
            Server obcServer = Bukkit.getServer();
            Class<?> obc = Bukkit.getServer().getClass();
            Class<?> nms = obc.getMethod("getServer").invoke(obcServer).getClass();
            server = nms.getMethod("getServer").invoke(null);
            try { recentTps = nms.getField("recentTps"); } catch (Throwable ignored) { }
            try {
                for (Field it : nms.getFields()) {
                    int f = it.getModifiers();
                    if (it.getType() == long[].class && it.getName().length() == 1 && Modifier.isPublic(f) &&
                            Modifier.isFinal(f) && !Modifier.isStatic(f) && it.isAccessible()) {
                        long[] arr = (long[]) it.get(server);
                        if (arr.length == 100) mspt = it;
                    }
                }
            } catch (Throwable ignored) { }
            try {
                Field field = obc.getDeclaredField("commandMap");
                field.setAccessible(true);
                commandMap = (CommandMap) field.get(obcServer);
            } catch (Throwable ignored) { }
        } catch (Throwable e) {
            e.printStackTrace();
        }
        versionInfo = Bukkit.getVersion().substring("git-Paper-".length())
                .split("[-\\s]")[0].replace("\"", "");
        if (versionInfo.length() != 7) try {
            @SuppressWarnings("unchecked") Map<String, String> map = (Map<String, String>)
                    Class.forName("io.papermc.paper.util.JarManifests").getField("MANIFEST_MAP").get(null);
            versionBranch = map.get("Git-Branch");
            commitId = map.get("Git-Commit");
        } catch (Throwable ignored) { }
    }

    public static double getTPS() {
        try {
            if (canGetTPS) return Bukkit.getTPS()[0];
            return ((double[]) recentTps.get(server))[0];
        } catch (Throwable ignored) { }
        return -1;
    }

    public static double getMSPT() {
        try {
            if (canGetAverageTickTime) return Bukkit.getAverageTickTime();
            long[] arr = (long[]) mspt.get(server);
            if (arr.length == 100) {
                long i = 0L;
                for (final long l : arr) i += l;
                return i / 100.0 * 1.0E-6D;
            }
        } catch (Throwable ignored) { }
        return -1;
    }

    @SuppressWarnings("deprecation")
    public static long getPlayerLastPlayTime(@NotNull OfflinePlayer p) {
        if (canGetLastLogin) return p.getLastLogin();
        return p.getLastPlayed();
    }

    @Nullable
    public static List<String> complete(final @NotNull Object[] args) {
        String buffer = (String) args[0];
        try {
            if (hasAsyncTabComplete) {
                AsyncTabCompleteEvent event = new AsyncTabCompleteEvent(Bukkit.getConsoleSender(),
                        Collections.emptyList(), buffer, true, null);
                event.callEvent();
                List<String> completions = event.isCancelled() ? new ArrayList<>() : event.getCompletions();
                if (event.isCancelled() || event.isHandled()) {
                    if (!event.isCancelled() && (TabCompleteEvent.getHandlerList().getRegisteredListeners()).length > 0) {
                        final ArrayList<String> finalCompletions = new ArrayList<>(completions);
                        FutureTask<List<String>> future = new FutureTask<>(() -> {
                            TabCompleteEvent syncEvent = new TabCompleteEvent(Bukkit.getConsoleSender(), buffer, finalCompletions);
                            return syncEvent.callEvent() ? syncEvent.getCompletions() : ImmutableList.of();
                        });
                        Bukkit.getScheduler().runTask(NekoMaid.INSTANCE, future);
                        List<String> legacyCompletions = future.get();
                        completions.removeIf(it -> !legacyCompletions.contains(it));
                        loop: for (String completion : legacyCompletions) {
                            for (String it : completions) if (it.equals(completion)) continue loop;
                            completions.add(completion);
                        }
                    }
                    return completions;
                }
            }
            FutureTask<List<String>> future = new FutureTask<>(() -> {
                List<String> offers = commandMap.tabComplete(Bukkit.getConsoleSender(), buffer);
                TabCompleteEvent tabEvent = new TabCompleteEvent(Bukkit.getConsoleSender(), buffer, (offers == null)
                        ? Collections.emptyList() : offers);
                Bukkit.getPluginManager().callEvent(tabEvent);
                return tabEvent.isCancelled() ? Collections.emptyList() : tabEvent.getCompletions();
            });
            Bukkit.getScheduler().runTask(NekoMaid.INSTANCE, future);
            return future.get();
        } catch (Throwable e) {
            e.printStackTrace();
        }
        return null;
    }

    private static boolean canSerialise(Object object) {
        return object == JSONObject.NULL || object instanceof JSONObject ||
                object instanceof JSONArray || object instanceof Number || object instanceof Boolean ||
                object instanceof byte[];
    }

    public static void serialize(Object[] args) {
        for (int i = 0; i < args.length; i++) args[i] = serialize(args[i]);
    }

    public static Object serialize(Object object) {
        try {
            if (canSerialise(object)) return object;
            if (object == null) return JSONObject.NULL;
            if (object instanceof String) {
                return ((String) object).startsWith(JSON_OBJECT) ? object : "\ud83d\udc2e" + object;
            } else return serializeToString(object);
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    public static String serializeToString(Object object) { return JSON_OBJECT + JSON.toJSONString(object); }

    public static int checkUpdate() {
        try {
            int catServer = checkCatServerUpdate();
            if (catServer != -2) return catServer;
            if (paperVersionFetcherClass != null) {
                Class<?> clazz = Bukkit.getUnsafe().getVersionFetcher().getClass();
                if (clazz == paperVersionFetcherClass) {
                    try {
                        if (isTuinity) return fetchDistanceFromGitHub("Tuinity/Tuinity", versionBranch, commitId);
                        else try {
                            return fetchDistanceFromSiteApi(Integer.parseInt(versionInfo), Bukkit.getMinecraftVersion());
                        } catch (Throwable ignored) {
                            return fetchDistanceFromGitHub("PaperMC/Paper", versionBranch, commitId);
                        }
                    } catch (Throwable ignored) { }
                }
            } else {
                String version = Bukkit.getVersion();
                String[] parts = version.substring(0, version.indexOf(' ')).split("-");
                if (parts.length != 4 && parts.length != 3) return -1;
                Method getDistance = VersionCommand.class.getDeclaredMethod("getDistance", String.class, String.class);
                getDistance.setAccessible(true);
                return parts.length == 4 ?
                        (int) getDistance.invoke(null, "spigot", parts[2]) +
                                (int) getDistance.invoke(null, "craftbukkit", parts[3])
                        : (int) getDistance.invoke(null, "craftbukkit", parts[2]);
            }
        } catch (Throwable ignored) { }
        return -1;
    }

    @SuppressWarnings("SameParameterValue")
    private static int fetchDistanceFromGitHub(String repo, String branch, String hash) {
        try {
            HttpURLConnection connection = (HttpURLConnection)(new URL("https://api.github.com/repos/" + repo +
                    "/compare/" + branch + "..." + hash)).openConnection();
            connection.connect();
            if (connection.getResponseCode() == 404)
                return -2;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),
                    StandardCharsets.UTF_8))) {
                JsonObject obj = new Gson().fromJson(reader, JsonObject.class);
                String status = obj.get("status").getAsString();
                switch (status) {
                    case "identical": return 0;
                    case "behind": return obj.get("behind_by").getAsInt();
                }
            }
        } catch (Throwable ignored) { }
        return -1;
    }

    @SuppressWarnings({"UnstableApiUsage", "OptionalGetWithoutIsPresent"})
    private static int fetchDistanceFromSiteApi(int jenkinsBuild, @Nullable String siteApiVersion) throws Throwable {
        if (siteApiVersion == null) return -1;
        try (BufferedReader reader = Resources.asCharSource(new URL("https://papermc.io/api/v2/projects/paper/versions/" +
                siteApiVersion), StandardCharsets.UTF_8).openBufferedStream()) {
            JsonObject json = new Gson().fromJson(reader, JsonObject.class);
            JsonArray builds = json.getAsJsonArray("builds");
            int latest = StreamSupport.stream(builds.spliterator(), false)
                    .mapToInt(JsonElement::getAsInt).max().getAsInt();
            return latest - jenkinsBuild;
        }
    }

    @SuppressWarnings("UnstableApiUsage")
    private static int checkCatServerUpdate() {
        try {
            Package pkg = Class.forName("catserver.server.CatServer").getPackage();
            String implementationVersion = pkg.getImplementationVersion();
            if ("Luohuayu".equals(pkg.getImplementationVendor()) && implementationVersion != null) {
                String[] split = implementationVersion.split("-");
                if (split.length == 4) {
                    try (BufferedReader reader = Resources.asCharSource(
                            new URL("https://catserver.moe/api/version/?v=universal"), StandardCharsets.UTF_8)
                            .openBufferedStream()) {
                        JsonObject json = new Gson().fromJson(reader, JsonObject.class);
                        return json.get("version").getAsString().equals(split[3]) ? 0 : 1;
                    }
                }
            }
            return -1;
        } catch (Throwable ignored) {
            return -2;
        }
    }

    public static boolean deletePath(Path p) {
        if (!Files.exists(p)) return true;
        try {
            Files.walkFileTree(p, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }
                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException e) throws IOException {
                    if (e != null) throw e;
                    Files.delete(dir);
                    return FileVisitResult.CONTINUE;
                }
            });
            return true;
        } catch (Throwable e) {
            e.printStackTrace();
            return false;
        }
    }

    public static boolean copyPath(Path src, Path dst) {
        try {
            Path dest0 = dst.resolve(src.getFileName());
            if (Files.exists(dest0)) {
                String[] names = src.getFileName().toString().split("\\.");
                if (names.length == 1) dest0 = dst.resolve(src.getFileName().toString() + ".copy");
                else {
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < names.length - 1; i++) sb.append(names[i]).append('.');
                    sb.append("copy.").append(names[names.length - 1]);
                    dest0 = dst.resolve(sb.toString());
                }
            }
            if (src.equals(dest0)) return false;
            Path dest = dest0;
            Files.walkFileTree(src, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    Path targetDir = dest.resolve(src.relativize(dir));
                    try {
                        Files.copy(dir, targetDir);
                    } catch (FileAlreadyExistsException e) {
                        if (!Files.isDirectory(targetDir)) throw e;
                    }
                    return FileVisitResult.CONTINUE;
                }
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.copy(file, dest.resolve(src.relativize(file)));
                    return FileVisitResult.CONTINUE;
                }
            });
            return true;
        } catch (Throwable e) {
            e.printStackTrace();
            return false;
        }
    }
}
