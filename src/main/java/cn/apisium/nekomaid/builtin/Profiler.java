package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.utils.OshiWrapper;
import cn.apisium.nekomaid.utils.Timings;
import cn.apisium.nekomaid.utils.TimingsV1;
import cn.apisium.nekomaid.utils.Utils;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.sun.management.GarbageCollectionNotificationInfo;
import com.sun.management.GcInfo;
import org.bukkit.Bukkit;
import org.bukkit.Chunk;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.BlockState;
import org.bukkit.command.*;
import org.bukkit.entity.Entity;
import org.bukkit.entity.EntityType;
import org.bukkit.event.*;
import org.bukkit.event.world.ChunkLoadEvent;
import org.bukkit.event.world.ChunkUnloadEvent;
import org.bukkit.plugin.EventExecutor;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.RegisteredListener;
import org.bukkit.plugin.SimplePluginManager;
import org.bukkit.scheduler.BukkitScheduler;
import org.bukkit.scheduler.BukkitTask;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.management.Notification;
import javax.management.NotificationEmitter;
import javax.management.NotificationListener;
import javax.management.ObjectName;
import javax.management.openmbean.CompositeData;
import java.lang.management.*;
import java.lang.reflect.Field;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class Profiler implements Listener, NotificationListener {
    private final NekoMaid main;
    private BukkitTask statusTimer, timingsTimer, pluginsTimer;
    private boolean started, hasData;
    private int loaded, unloaded;
    private Object lastTimingsData;
    private static boolean canGetData = true;
    private static final Field executorField;
    private static Field rTaskField;
    private static final Field commandCompleter, commandExecutor;
    private static final SimpleCommandMap commandMap;
    private static final Runtime runtime = Runtime.getRuntime();
    private static final OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
    private static final Pattern HEAP_REGEXP = Pattern.compile(": +(\\d+) +(\\d+) +([^\\s]+).*"),
            HEAP_NUMBER_NAME_REGEXP = Pattern.compile("\\$\\d");
    private final HashMap<String, long[]> lastGc = new HashMap<>();
    private final HashMap<String, HashMap<String, long[]>[]> plugins = new HashMap<>();
    private final ArrayList<NotificationEmitter> emitters = new ArrayList<>();

    static {
        try {
            executorField = RegisteredListener.class.getDeclaredField("executor");
            executorField.setAccessible(true);
            Field f = SimplePluginManager.class.getDeclaredField("commandMap");
            f.setAccessible(true);
            commandMap = (SimpleCommandMap) f.get(Bukkit.getPluginManager());
            commandExecutor = PluginCommand.class.getDeclaredField("executor");
            commandExecutor.setAccessible(true);
            commandCompleter = PluginCommand.class.getDeclaredField("completer");
            commandCompleter.setAccessible(true);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }

    public Profiler(NekoMaid main) {
        this.main = main;
        if (Timings.INSTANCE != null) {
            main.GLOBAL_DATA.put("hasTimings", true);
            if (Timings.INSTANCE.getClass() == TimingsV1.class) main.GLOBAL_DATA.put("isTimingsV1", true);
        }
        main.onConnected(main, client -> {
            client.on("profiler:status", args -> {
                if (started = (boolean) args[0]) main.GLOBAL_DATA.put("profilerStarted", true);
                else main.GLOBAL_DATA.remove("profilerStarted");
                main.broadcast(main, "profiler:status", started);
                checkTask();
            }).onWithMultiArgsAck("profiler:heap", args -> {
                try {
                    Matcher m = HEAP_REGEXP.matcher((String) ManagementFactory.getPlatformMBeanServer()
                            .invoke(ObjectName.getInstance("com.sun.management:type=DiagnosticCommand"),
                                    "gcClassHistogram", new Object[] { new String[0] },
                                    new String[]{ String[].class.getName() }));
                    HashMap<String, long[]> map = new HashMap<>();
                    while (m.find()) {
                        long memory = Long.parseLong(m.group(2));
                        String name;
                        if (memory > 10240) {
                            name = m.group(3);
                            if (name.startsWith("jdk.internal.reflect.") || name.startsWith("jdk.proxy")) continue;
                            int i = name.indexOf("$$Lambda");
                            if (i > 0) name = name.substring(0, i - 1);
                            Matcher m2 = HEAP_NUMBER_NAME_REGEXP.matcher(name);
                            if (m2.find() && (i = m2.start()) > 1) name = name.substring(0, i - 1);
                            if (name.endsWith(";")) name = name.substring(0, name.length() - 1);
                        } else name = "others";
                        long[] it = map.computeIfAbsent(name, k -> new long[3]);
                        it[0] += Long.parseLong(m.group(1));
                        it[1] += memory;
                    }
                    HashMap<String, String> fileMap;
                    if (Utils.classLoaderGetName == null) fileMap = null;
                    else {
                        fileMap = new HashMap<>();
                        map.forEach((k, v) -> {
                            int i = 0;
                            while (k.charAt(i) == '[') i++;
                            String name = k.substring(i);
                            if (name.startsWith("L")) name = name.substring(1);
                            try {
                                fileMap.put(k, (String) Utils.classLoaderGetName.invoke(Class.forName(name).getClassLoader()));
                            } catch (Throwable ignored) { }
                        });
                    }
                    return new Object[] { map, fileMap };
                } catch (Throwable e) {
                    e.printStackTrace();
                    return new Object[] { null, null };
                }
            }).onWithMultiArgsAck("profiler:threads", args -> {
                Thread t = Utils.getMinecraftServerThread();
                return new Object[] {
                        Arrays.stream(ManagementFactory.getThreadMXBean()
                                .dumpAllThreads(true, true)).map(it -> {
                            JSONObject obj = new JSONObject();
                            obj.put("name", it.getThreadName());
                            obj.put("id", it.getThreadId());
                            obj.put("state", it.getThreadState().toString());
                            MonitorInfo[] info = it.getLockedMonitors();
                            if (info.length != 0) {
                                JSONArray arr = new JSONArray(info.length);
                                for (MonitorInfo monitor : info) arr.add(monitor.getLockedStackFrame().toString());
                                obj.put("lock", arr);
                            }
                            StringBuilder sb = new StringBuilder();
                            for (StackTraceElement stack : Utils.deobfuscateStacktrace(it.getStackTrace()))
                                sb.append(stack.toString()).append('\n');
                            obj.put("stack", sb.toString());
                            return obj;
                        }).toArray(),
                        t == null ? -1 : t.getId()
                };
            }).onWithAck("profiler:entities", (Function<Object[], Object>)
                    args -> Utils.sync(() -> {
                        HashMap<EntityType, Integer> entities = new HashMap<>();
                        HashMap<Material, Integer> tiles = new HashMap<>();
                        ArrayList<Object[]> arr = new ArrayList<>();
                        for (World it : main.getServer().getWorlds()) {
                            Chunk[] chunks = it.getLoadedChunks();
                            for (Chunk chunk : chunks) {
                                Entity[] entitiesArr = chunk.getEntities();
                                BlockState[] stateArr = chunk.getTileEntities();
                                for (Entity entity : entitiesArr)
                                    entities.put(entity.getType(), entities.getOrDefault(entity.getType(), 0) + 1);
                                for (BlockState state : stateArr)
                                    tiles.put(state.getType(), tiles.getOrDefault(state.getType(), 0) + 1);
                                arr.add(new Object[] { chunk, entitiesArr.length, stateArr.length });
                            }
                        }
                        return new Object[] { entities, tiles,
                                arr.stream().sorted((a, b) -> (int) b[1] - (int) a[1]).limit(25).map(it -> {
                                    Chunk ch = (Chunk) it[0];
                                    ChunkData data = new ChunkData(ch, (int) it[1]);
                                    for (Entity entity : ch.getEntities()) {
                                        String name = entity.getType().name();
                                        data.data.put(name, data.data.getOrDefault(name, 0) + 1);
                                    }
                                    return data;
                                }).toArray(),
                                arr.stream().sorted((a, b) -> (int) b[2] - (int) a[2]).limit(25).map(it -> {
                                    Chunk ch = (Chunk) it[0];
                                    ChunkData data = new ChunkData(ch, (int) it[2]);
                                    for (BlockState state : ch.getTileEntities()) {
                                        String name = state.getType().name();
                                        data.data.put(name, data.data.getOrDefault(name, 0) + 1);
                                    }
                                    return data;
                                }).toArray()};
                    })
            ).on("profiler:fetchPlugins", () -> client.emit("profiler:plugins", plugins));
            if (Timings.INSTANCE != null) client.onWithAck("profiler:timingsStatus", args -> {
                if (args.length == 2) {
                    Timings.INSTANCE.setEnable((boolean) args[0]);
                    if (!(boolean) args[0]) lastTimingsData = null;
                }
                if (lastTimingsData != null) client.emit("profiler:timings", lastTimingsData);
                return Timings.INSTANCE.isStarted();
            });
        });
    }

    private void checkTask() {
        try {
            if (started) {
                unloaded = loaded = 0;
                hasData = false;
                lastGc.clear();
                BukkitScheduler s = main.getServer().getScheduler();
                statusTimer = s.runTaskTimerAsynchronously(main, () -> {
                    if (hasData) {
                        if (main.getClientsCountInPage(main, "profiler") != 0) {
                            main.broadcastInPage(main, "profiler", "profiler:current", getStatus());
                        }
                    } else {
                        hasData = true;
                        getStatus();
                    }
                    injectTasks();
                }, 0, 5 * 20);
                pluginsTimer = s.runTaskTimerAsynchronously(main, () -> {
                    if (main.getClientsCountInPage(main, "profiler") != 0) {
                        main.broadcastInPage(main, "profiler", "profiler:plugins", plugins);
                    }
                    plugins.forEach((k, v) -> { for (int i = 0; i < 3; i++) v[i].clear(); });
                }, 30 * 20, 30 * 20);
                if (Timings.INSTANCE != null) {
                    timingsTimer = s.runTaskTimerAsynchronously(main, () -> {
                        if (main.getClientsCountInPage(main, "profiler") != 0) {
                            main.broadcastInPage(main, "profiler",
                                    "profiler:timings", lastTimingsData = Timings.INSTANCE.exportData());
                        }
                    }, Timings.INSTANCE.isStarted() ? 0 : 30 * 20, 30 * 20);
                }
                main.getServer().getPluginManager().registerEvent(ChunkLoadEvent.class, this, EventPriority.MONITOR,
                        (c, e) -> loaded++, main, true);
                main.getServer().getPluginManager().registerEvent(ChunkUnloadEvent.class, this, EventPriority.MONITOR,
                        (c, e) -> unloaded++, main, true);
                inject();
            } else {
                plugins.clear();
                statusTimer.cancel();
                pluginsTimer.cancel();
                statusTimer = null;
                if (Timings.INSTANCE != null) {
                    timingsTimer.cancel();
                    timingsTimer = null;
                }
                ChunkLoadEvent.getHandlerList().unregister(this);
                ChunkUnloadEvent.getHandlerList().unregister(this);
                uninject();
            }
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    private Status getStatus() {
        Status status = new Status();
        status.tps = Utils.getTPS();
        status.mspt = Utils.getMSPT();
        status.cpu = os.getSystemLoadAverage();
        status.threads = Thread.activeCount();
        status.memory = runtime.totalMemory() - runtime.freeMemory();
        status.totalMemory = runtime.maxMemory();
        status.chunkLoads = loaded;
        status.chunkUnloads = unloaded;
        unloaded = loaded = 0;
        List<World> worlds = Bukkit.getServer().getWorlds();
        ManagementFactory.getGarbageCollectorMXBeans().forEach(it -> {
            String name = it.getName();
            long time = it.getCollectionTime(), count = it.getCollectionCount();
            long[] arr = lastGc.computeIfAbsent(name, a -> new long[2]);
            status.gc.put(name, new long[] { time - arr[0], count - arr[1] });
            arr[0] = time;
            arr[1] = count;
        });
        if (canGetData) try {
            OshiWrapper.class.getMethod("applyProfilerStatus", Status.class).invoke(null, status);
        } catch (Throwable ignored) { canGetData = false; }
        status.worlds = Utils.sync(() -> worlds.stream().map(Worlds.WorldData::new)
                .toArray(Worlds.WorldData[]::new));
        return status;
    }

    @SuppressWarnings("unchecked")
    private void injectTasks() {
        main.getServer().getScheduler().getPendingTasks().forEach(it -> {
            try {
                if (it.isCancelled() || !it.isSync()) return;
                if (rTaskField == null) {
                    try { rTaskField = it.getClass().getDeclaredField("rTask"); } catch (Throwable ignored) {
                        rTaskField = it.getClass().getDeclaredField("task");
                    }
                    rTaskField.setAccessible(true);
                }
                Runnable delegate = (Runnable) rTaskField.get(it);
                if (!(delegate instanceof ProxiedRunnable)) {
                    rTaskField.set(it, new ProxiedRunnable(delegate, plugins.computeIfAbsent(it.getOwner().getName(),
                            a -> new HashMap[] { new HashMap<>(), new HashMap<>(), new HashMap<>() })[1],
                            String.valueOf(it.getTaskId())));
                }
            } catch (Throwable e) {
                e.printStackTrace();
            }
        });
    }

    @SuppressWarnings({ "SynchronizationOnLocalVariableOrMethodParameter", "unchecked" })
    private void inject() {
        for (Plugin plugin : main.getServer().getPluginManager().getPlugins()) {
            HashMap<String, long[]> eventsMap = new HashMap<>();
            plugins.put(plugin.getName(), new HashMap[] { eventsMap, new HashMap<>(), new HashMap<>() });
            HandlerList.getRegisteredListeners(plugin).forEach(it -> {
                try {
                    EventExecutor delegate = (EventExecutor) executorField.get(it);
                    synchronized (delegate) {
                        if (!(delegate instanceof ProxiedEventExecutor))
                            executorField.set(it, new ProxiedEventExecutor(delegate, eventsMap));
                    }
                } catch (Throwable e) {
                    e.printStackTrace();
                }
            });
        }
        for (Command command : commandMap.getCommands()) {
            if (!(command instanceof PluginCommand)) continue;
            synchronized (command) {
                try {
                    CommandExecutor executor = (CommandExecutor) commandExecutor.get(command);
                    TabCompleter completer = (TabCompleter) commandCompleter.get(command);
                    if (executor instanceof ProxiedTabExecutor || completer instanceof ProxiedTabExecutor) continue;
                    ProxiedTabExecutor obj = new ProxiedTabExecutor(executor, completer,
                            plugins.computeIfAbsent(((PluginCommand) command).getPlugin().getName(),
                            a -> new HashMap[] { new HashMap<>(), new HashMap<>(), new HashMap<>() })[2]);
                    commandExecutor.set(command, obj);
                    if (completer != null) commandCompleter.set(command, obj);
                } catch (Throwable e) {
                    e.printStackTrace();
                }
            }
        }
        for (GarbageCollectorMXBean bean : ManagementFactory.getGarbageCollectorMXBeans()) {
            if (bean instanceof NotificationEmitter) {
                NotificationEmitter notificationEmitter = (NotificationEmitter) bean;
                notificationEmitter.addNotificationListener(this, null, null);
                emitters.add(notificationEmitter);
            }
        }
    }

    @SuppressWarnings("SynchronizationOnLocalVariableOrMethodParameter")
    private void uninject() {
        emitters.forEach(it -> {
            try {
                it.removeNotificationListener(this);
            } catch (Throwable e) {
                e.printStackTrace();
            }
        });
        emitters.clear();
        for (Plugin plugin : main.getServer().getPluginManager().getPlugins()) {
            HandlerList.getRegisteredListeners(plugin).forEach(it -> {
                try {
                    Object obj = executorField.get(it);
                    synchronized (obj) {
                        if (obj instanceof ProxiedEventExecutor)
                            executorField.set(it, ((ProxiedEventExecutor) obj).delegate);
                    }
                } catch (IllegalAccessException e) {
                    e.printStackTrace();
                }
            });
        }
        if (rTaskField != null) main.getServer().getScheduler().getPendingTasks().forEach(it -> {
            if (it.isCancelled() || !it.isSync()) return;
            try {
                Runnable delegate = (Runnable) rTaskField.get(it);
                synchronized (delegate) {
                    if (delegate instanceof ProxiedRunnable) rTaskField.set(it, ((ProxiedRunnable) delegate).delegate);
                }
            } catch (Throwable e) {
                e.printStackTrace();
            }
        });
        for (Command command : commandMap.getCommands()) {
            if (!(command instanceof PluginCommand)) continue;
            synchronized (command) {
                try {
                    CommandExecutor executor = (CommandExecutor) commandExecutor.get(command);
                    TabCompleter completer = (TabCompleter) commandCompleter.get(command);
                    if (executor instanceof ProxiedTabExecutor)
                        commandExecutor.set(command, ((ProxiedTabExecutor) executor).delegateExecutor);
                    if (completer instanceof ProxiedTabExecutor)
                        commandCompleter.set(command, ((ProxiedTabExecutor) completer).delegateCompleter);
                } catch (Throwable e) {
                    e.printStackTrace();
                }
            }
        }
    }

    @Override
    public void handleNotification(Notification notification, Object obj) {
        if (notification.getType().equals(GarbageCollectionNotificationInfo.GARBAGE_COLLECTION_NOTIFICATION)) {
            main.broadcastInPage(main, "profiler", "profiler:gc", new GCInfo(GarbageCollectionNotificationInfo
                    .from((CompositeData) notification.getUserData())));
        }
    }

    private static class ProxiedEventExecutor implements EventExecutor {
        private final EventExecutor delegate;
        private final HashMap<String, long[]> record;
        public ProxiedEventExecutor(EventExecutor delegate, HashMap<String, long[]> record) {
            this.delegate = delegate;
            this.record = record;
        }

        @Override
        public void execute(@NotNull Listener listener, @NotNull Event event) throws EventException {
            if (event.isAsynchronous()) {
                delegate.execute(listener, event);
                return;
            }
            long start = System.nanoTime();
            long[] data = record.computeIfAbsent(event.getEventName(), a -> new long[2]);
            data[0]++;
            try {
                delegate.execute(listener, event);
            } finally {
                data[1] += System.nanoTime() - start;
            }
        }
    }

    private static class ProxiedRunnable implements Runnable {
        private final Runnable delegate;
        private final HashMap<String, long[]> record;
        private final String taskId;
        public ProxiedRunnable(Runnable delegate, HashMap<String, long[]> record, String taskId) {
            this.delegate = delegate;
            this.record = record;
            this.taskId = taskId;
        }

        @Override
        public void run() {
            long start = System.nanoTime();
            long[] data = record.computeIfAbsent(taskId, a -> new long[2]);
            data[0]++;
            try {
                delegate.run();
            } finally {
                data[1] += System.nanoTime() - start;
            }
        }
    }

    private static class ProxiedTabExecutor implements TabExecutor {
        private final CommandExecutor delegateExecutor;
        private final TabCompleter delegateCompleter;
        private final HashMap<String, long[]> record;
        private final boolean isNotTabExecutor;
        public ProxiedTabExecutor(CommandExecutor delegateExecutor, TabCompleter delegateCompleter,
                                  HashMap<String, long[]> record) {
            this.delegateExecutor = delegateExecutor;
            this.delegateCompleter = delegateCompleter;
            this.record = record;
            isNotTabExecutor = !(delegateExecutor instanceof TabCompleter);
        }

        @Override
        public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                                 @NotNull String label, @NotNull String[] args) {
            long start = System.nanoTime();
            long[] data = record.computeIfAbsent("/" + command.getName(), a -> new long[2]);
            data[0]++;
            try {
                return delegateExecutor.onCommand(sender, command, label, args);
            } finally {
                data[1] += System.nanoTime() - start;
            }
        }

        @Override
        public @Nullable List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                                    @NotNull String alias, @NotNull String[] args) {
            if (delegateCompleter == null && isNotTabExecutor) return null;
            long start = System.nanoTime();
            long[] data = record.computeIfAbsent(command.getName(), a -> new long[2]);
            data[0]++;
            try {
                return (delegateCompleter == null ? (TabCompleter) delegateExecutor : delegateCompleter)
                        .onTabComplete(sender, command, alias, args);
            } finally {
                data[1] += System.nanoTime() - start;
            }
        }
    }

    public void stop() {
        if (started) {
            started = false;
            uninject();
        }
    }

    public static final class Status {
        public int threads, chunkLoads, chunkUnloads;
        public long reads, writes, recv, sent;
        public double[] processorLoad;
        public double tps, mspt, cpu, memory, totalMemory, temperature;
        public Worlds.WorldData[] worlds;
        public HashMap<String, long[]> gc = new HashMap<>();
    }

    private static final class ChunkData {
        public final String world;
        public final int x, z, count;
        public final HashMap<String, Integer> data = new HashMap<>();
        public ChunkData(Chunk ch, int count) {
            world = ch.getWorld().getName();
            x = ch.getX();
            z = ch.getZ();
            this.count = count;
        }
    }

    private static final class GCInfo {
        public final String name, action, cause;
        public final long id, duration;
        public final HashMap<String, Long> before = new HashMap<>(), after = new HashMap<>();
        public GCInfo(GarbageCollectionNotificationInfo info) {
            name = info.getGcName();
            action = info.getGcAction();
            cause = info.getGcCause();
            GcInfo i = info.getGcInfo();
            id = i.getId();
            duration = i.getDuration();
            i.getMemoryUsageBeforeGc().forEach((k, v) -> before.put(k, v.getUsed()));
            i.getMemoryUsageAfterGc().forEach((k, v) -> after.put(k, v.getUsed()));
        }
    }
}
