package cn.apisium.nekomaid;

import com.alibaba.fastjson.JSON;
import com.destroystokyo.paper.event.server.AsyncTabCompleteEvent;
import com.google.common.collect.ImmutableList;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.event.server.TabCompleteEvent;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.FutureTask;

@SuppressWarnings("deprecation")
public final class Utils {
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
                TabCompleteEvent tabEvent = new TabCompleteEvent(Bukkit.getConsoleSender(), buffer, (offers == null) ? Collections.emptyList() : offers);
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
}
