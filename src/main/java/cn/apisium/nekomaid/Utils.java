package cn.apisium.nekomaid;

import com.destroystokyo.paper.event.server.AsyncTabCompleteEvent;
import com.google.common.collect.ImmutableList;
import org.bukkit.Bukkit;
import org.bukkit.event.server.TabCompleteEvent;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

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
