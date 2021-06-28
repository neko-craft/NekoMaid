package cn.apisium.nekomaid;

import com.destroystokyo.paper.event.server.AsyncTabCompleteEvent;
import com.earth2me.essentials.Essentials;
import com.earth2me.essentials.IEssentials;
import com.google.common.collect.ImmutableList;
import io.papermc.lib.PaperLib;
import org.bukkit.Bukkit;
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
    static {
        var tmp = false;
        try {
            Class.forName("com.destroystokyo.paper.event.server.AsyncTabCompleteEvent");
            tmp = true;
        } catch (Exception ignored) { }
        IS_PAPER = tmp;
    }

    public static double getTPS() {
        if (IS_PAPER) return Bukkit.getTPS()[0];
        var p = Bukkit.getPluginManager().getPlugin("Essentials");
        if (p != null && p.isEnabled()) return ((IEssentials) p).getTimer().getAverageTPS();
        try {
            var nms = Class.forName("net.minecraft.server.MinecraftServer");
            return ((double[]) nms.getField("recentTps").get(nms.getMethod("getServer").invoke(null)))[0];
        } catch (Exception ignored) { }
        return -1;
    }

    public static double getMSPT() {
        if (IS_PAPER) return Bukkit.getAverageTickTime();
        try {
            var nms = Class.forName("net.minecraft.server.MinecraftServer");
            for (var it : nms.getFields()) {
                var f = it.getModifiers();
                var server = nms.getMethod("getServer").invoke(null);
                if (it.getType() == long[].class && it.getName().length() == 1 && Modifier.isPublic(f) &&
                        Modifier.isFinal(f) && !Modifier.isStatic(f) && it.canAccess(server)) {
                    var arr = (long[]) it.get(server);
                    if (arr.length == 100) {
                        long i = 0L;
                        for (final long l : arr) i += l;
                        return i / 100.0 * 1.0E-6D;
                    }
                }
            }
        } catch (Exception ignored) { }
        return -1;
    }

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
