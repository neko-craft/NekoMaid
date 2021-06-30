package cn.apisium.nekomaid;

import com.destroystokyo.paper.event.server.AsyncTabCompleteEvent;
import com.google.common.collect.ImmutableList;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.event.server.TabCompleteEvent;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.FutureTask;

public final class Utils {
    private final static boolean IS_PAPER;
    private static Object server;
    private static Field recentTps, mspt;
    static {
        var tmp = false;
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
                for (var it : nms.getFields()) {
                    var f = it.getModifiers();
                    if (it.getType() == long[].class && it.getName().length() == 1 && Modifier.isPublic(f) &&
                            Modifier.isFinal(f) && !Modifier.isStatic(f) && it.canAccess(server)) {
                        var arr = (long[]) it.get(server);
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
            var arr = (long[]) mspt.get(server);
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
    public static List<String> complete(final @NotNull String buffer) {
        try {
            if (IS_PAPER) {
                var event = new AsyncTabCompleteEvent(Bukkit.getConsoleSender(), buffer, true, null);
                event.callEvent();
                var completions = event.isCancelled() ? ImmutableList.<String>of() : event.getCompletions();
                if (event.isCancelled() || event.isHandled()) {
                    if (!event.isCancelled() && (TabCompleteEvent.getHandlerList().getRegisteredListeners()).length > 0) {
                        final var finalCompletions = new ArrayList<>(completions);
                        var future = new FutureTask<List<String>>(() -> {
                            var syncEvent = new TabCompleteEvent(Bukkit.getConsoleSender(), buffer, finalCompletions);
                            return syncEvent.callEvent() ? syncEvent.getCompletions() : ImmutableList.of();
                        });
                        Bukkit.getScheduler().runTask(NekoMaid.INSTANCE, future);
                        var legacyCompletions = future.get();
                        completions.removeIf(it -> !legacyCompletions.contains(it));
                        loop: for (var completion : legacyCompletions) {
                            for (var it : completions) if (it.equals(completion)) continue loop;
                            completions.add(completion);
                        }
                    }
                    return completions;
                }
            }
            var future = new FutureTask<List<String>>(() -> {
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
}
