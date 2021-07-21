package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import com.alibaba.fastjson.JSONArray;
import org.apache.logging.log4j.core.config.ConfigurationScheduler;
import org.apache.logging.log4j.core.util.CronExpression;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;

class Scheduler {
    private ConfigurationScheduler scheduler;
    private boolean HAS_PLACEHOLDER_API;
    private ArrayList<Task> tasks;
    private final NekoMaid main;

    public Scheduler(NekoMaid main) {
        this.main = main;
        try {
            Class.forName("me.clip.placeholderapi.PlaceholderAPI");
            HAS_PLACEHOLDER_API = true;
        } catch (Exception ignored) { }
        Path configFile = new File(main.getDataFolder(), "scheduler.json").toPath();
        try {
            if (!Files.exists(configFile)) Files.write(configFile, "[]".getBytes(StandardCharsets.UTF_8));
            tasks = new ArrayList<>(JSONArray.parseArray(new String(Files.readAllBytes(configFile)), Task.class));
        } catch (Exception ignored) {
            tasks = new ArrayList<>();
        }
        refresh();
        main.onConnected(main, client -> client.onWithAck("scheduler:fetch", args -> tasks)
                .onWithAck("scheduler:run", args -> {
                    try {
                        runTask(tasks.get((int) args[0]));
                        return true;
                    } catch (Exception ignored) {
                        return false;
                    }
                })
                .onWithAck("scheduler:update", args -> {
                    try {
                        String json = (String) args[0];
                        tasks = new ArrayList<>(JSONArray.parseArray(json, Task.class));
                        refresh();
                        Files.write(configFile, json.getBytes(StandardCharsets.UTF_8));
                        return true;
                    } catch (Exception ignored) {
                        return false;
                    }
                }));
    }

    public void stop() {
        scheduler.stop();
    }

    private String setPlaceholders(String cmd) {
        return HAS_PLACEHOLDER_API ? me.clip.placeholderapi.PlaceholderAPI.setPlaceholders(null, cmd) : cmd;
    }

    @SuppressWarnings("deprecation")
    private void runTask(Task task) {
        for (String value : task.values) {
            if (value.startsWith("/")) main.getServer().getScheduler().runTask(main,
                    () -> main.getServer().dispatchCommand(main.getServer().getConsoleSender(),
                            setPlaceholders(value.substring(1))));
            else main.getServer().broadcastMessage(setPlaceholders(value));
        }
    }

    private void refresh() {
        if (scheduler != null) scheduler.stop();
        scheduler = new ConfigurationScheduler("NekoMaidScheduler");
        scheduler.incrementScheduledItems();
        scheduler.incrementScheduledItems();
        scheduler.incrementScheduledItems();
        scheduler.incrementScheduledItems();
        scheduler.incrementScheduledItems();
        tasks.forEach(it -> {
            if (it.values.length > 0 && it.enabled) try {
                scheduler.scheduleWithCron(new CronExpression("0 " + it.cron.replaceAll("\\*$", "?")), () -> runTask(it));
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
        scheduler.start();
    }

    @SuppressWarnings("unused")
    private static final class Task {
        public boolean enabled;
        public String name, cron;
        public String[] values;
    }
}
