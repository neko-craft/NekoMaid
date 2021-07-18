package cn.apisium.nekomaid;

import com.alibaba.fastjson.JSON;
import com.destroystokyo.paper.event.server.AsyncTabCompleteEvent;
import com.google.common.collect.ImmutableList;
import com.google.common.io.Resources;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.netty.handler.codec.base64.Base64Decoder;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.defaults.VersionCommand;
import org.bukkit.event.server.TabCompleteEvent;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.json.JSONArray;
import org.json.JSONObject;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.spec.KeySpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.FutureTask;
import java.util.stream.StreamSupport;

@SuppressWarnings("deprecation")
public final class Utils {
    private final static IvParameterSpec iv = new IvParameterSpec("NekoMaidIvParSpe".getBytes(StandardCharsets.UTF_8));
    private final static boolean IS_PAPER;
    private static Object server;
    private static Field recentTps, mspt;
    static {
        boolean tmp = false;
        try {
            Class.forName("com.destroystokyo.paper.event.server.AsyncTabCompleteEvent");
            tmp = true;
        } catch (Exception ignored) { }
        IS_PAPER = tmp;
        try {
            Class<?> nms = Bukkit.getServer().getClass().getMethod("getServer").invoke(Bukkit.getServer()).getClass();
            server = nms.getMethod("getServer").invoke(null);
            try { recentTps = nms.getField("recentTps"); } catch (Exception ignored) { }
            try {
                for (Field it : nms.getFields()) {
                    int f = it.getModifiers();
                    if (it.getType() == long[].class && it.getName().length() == 1 && Modifier.isPublic(f) &&
                            Modifier.isFinal(f) && !Modifier.isStatic(f) && it.isAccessible()) {
                        long[] arr = (long[]) it.get(server);
                        if (arr.length == 100) mspt = it;
                    }
                }
            } catch (Exception ignored) { }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static double getTPS() {
        if (IS_PAPER) return Bukkit.getTPS()[0];
        try {
            return ((double[]) recentTps.get(server))[0];
        } catch (Exception ignored) { }
        return -1;
    }

    public static double getMSPT() {
        if (IS_PAPER) return Bukkit.getAverageTickTime();
        try {
            long[] arr = (long[]) mspt.get(server);
            if (arr.length == 100) {
                long i = 0L;
                for (final long l : arr) i += l;
                return i / 100.0 * 1.0E-6D;
            }
        } catch (Exception ignored) { }
        return -1;
    }

    @SuppressWarnings("deprecation")
    public static long getPlayerLastPlayTime(@NotNull OfflinePlayer p) { return IS_PAPER ? p.getLastLogin() : p.getLastPlayed(); }

    @Nullable
    public static List<String> complete(final @NotNull Object[] args) {
        String buffer = (String) args[0];
        try {
            if (IS_PAPER) {
                AsyncTabCompleteEvent event = new AsyncTabCompleteEvent(Bukkit.getConsoleSender(), buffer, true, null);
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
                List<String> offers = Bukkit.getCommandMap().tabComplete(Bukkit.getConsoleSender(), buffer);
                TabCompleteEvent tabEvent = new TabCompleteEvent(Bukkit.getConsoleSender(), buffer, (offers == null)
                        ? Collections.emptyList() : offers);
                Bukkit.getPluginManager().callEvent(tabEvent);
                return tabEvent.isCancelled() ? Collections.emptyList() : tabEvent.getCompletions();
            });
            Bukkit.getScheduler().runTask(NekoMaid.INSTANCE, future);
            return future.get();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private static boolean canSerialise(Object object) {
        return object == null || object == JSONObject.NULL || object instanceof JSONObject ||
                object instanceof JSONArray || object instanceof Number || object instanceof Boolean ||
                object instanceof byte[];
    }

    public static void serialize(Object[] args) {
        for (int i = 0; i < args.length; i++) {
            Object object = args[i];
            if (canSerialise(object)) continue;
            args[i] = object instanceof String ? "\ud83d\udc2e" + object : "\ud83c\udf7a" + JSON.toJSONString(object);
        }
    }

    public static Object serialize(Object object) {
        return canSerialise(object) ? object : object instanceof String ? "\ud83d\udc2e" + object
                : "\ud83c\udf7a" + JSON.toJSONString(object);
    }

    public static int checkUpdate() {
        try {
        if (IS_PAPER) {
            Class<?> clazz = Bukkit.getUnsafe().getVersionFetcher().getClass();
            if (clazz == Class.forName("com.destroystokyo.paper.PaperVersionFetcher")) {
                try {
                    Class.forName("com.tuinity.tuinity.config.TuinityConfig");
                    return fetchDistanceFromGitHub("Tuinity/Tuinity", "master", Bukkit.getVersion()
                            .substring("git-Tuinity-".length()).split("[-\\s]")[0].replace("\"", ""));
                } catch (Exception ignored) { }
                String versionInfo = Bukkit.getVersion().substring("git-Paper-".length())
                        .split("[-\\s]")[0].replace("\"", "");
                try {
                    return fetchDistanceFromSiteApi(Integer.parseInt(versionInfo), Bukkit.getMinecraftVersion());
                } catch (Exception ignored) {
                    return fetchDistanceFromGitHub("PaperMC/Paper", "master", versionInfo);
                }
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
        } catch (Exception ignored) { }
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
        } catch (Exception ignored) { }
        return -1;
    }

    @SuppressWarnings({"UnstableApiUsage", "OptionalGetWithoutIsPresent"})
    private static int fetchDistanceFromSiteApi(int jenkinsBuild, @Nullable String siteApiVersion) throws Exception {
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

    public static String decrypt(String text, String secret) {
        try {
            byte[] data = Base64.getDecoder().decode(text);
            char[] secretArr = secret.toCharArray(), out = new char[data.length];
            int len = secretArr.length;
            for (int i = 0; i < data.length; i++) out[i] = (char) (data[i] ^ (--len >= 0 ? secretArr[len] : i + 66));
            return new String(out);
        } catch (Exception e) {
            return null;
        }
    }
}
