package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import co.aikar.timings.TimingHistory;
import co.aikar.timings.Timings;
import com.alibaba.fastjson.JSONObject;
import org.bukkit.scheduler.BukkitTask;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
final class Profiler {
    private final NekoMaid main;
    private BukkitTask timingsTimer;
    private static final Map<String, Object> GROUP_MAP;
    private static final Field groupHandlers, identifier, identifierName, handlerId, groupName, groupId;
    private static final Method isTimed, isSpecial, export;
    private static final Constructor<TimingHistory> timingHistory;

    static {
        try {
            Class<?> timingHandler = Class.forName("co.aikar.timings.TimingHandler"),
                    timingIdentifier = Class.forName("co.aikar.timings.TimingIdentifier"),
                    timingGroup = Class.forName("co.aikar.timings.TimingIdentifier$TimingGroup");
            Field GROUP_MAP0 = timingIdentifier.getDeclaredField("GROUP_MAP");
            GROUP_MAP0.setAccessible(true);
            GROUP_MAP = (Map<String, Object>) GROUP_MAP0.get(null);
            groupHandlers = timingGroup.getDeclaredField("handlers");
            groupHandlers.setAccessible(true);
            groupName = timingGroup.getDeclaredField("name");
            groupName.setAccessible(true);
            groupId = timingGroup.getDeclaredField("id");
            groupId.setAccessible(true);
            isTimed = timingHandler.getDeclaredMethod("isTimed");
            isTimed.setAccessible(true);
            isSpecial = timingHandler.getMethod("isSpecial");
            isSpecial.setAccessible(true);
            identifierName = timingIdentifier.getDeclaredField("name");
            identifierName.setAccessible(true);
            identifier = timingHandler.getDeclaredField("identifier");
            identifier.setAccessible(true);
            handlerId = timingHandler.getDeclaredField("id");
            handlerId.setAccessible(true);
            export = TimingHistory.class.getDeclaredMethod("export");
            export.setAccessible(true);
            timingHistory = TimingHistory.class.getDeclaredConstructor();
            timingHistory.setAccessible(true);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }

    public Profiler(NekoMaid main) {
        this.main = main;
        main.GLOBAL_DATA.put("hasProfiler", true);
        main.onConnected(main, client -> client.onWithAck("profiler:timings", args -> {
            if (args.length == 2) {
                Timings.setTimingsEnabled((boolean) args[0]);
//                checkTask();
            }
            return exportData();
        }).on("profiler:verbose", args -> Timings.setVerboseTimingsEnabled((boolean) args[0])));
    }

    private void checkTask() {
        boolean res = Timings.isTimingsEnabled();
        if (res) {
            if (timingsTimer == null) {
                timingsTimer = main.getServer().getScheduler().runTaskTimerAsynchronously(main, () -> {

                }, 30 * 20, 30 * 20);
            }
        } else if (timingsTimer != null) {
            timingsTimer.cancel();
            timingsTimer = null;
        }
    }

    @SuppressWarnings("SynchronizationOnLocalVariableOrMethodParameter")
    public static JSONObject exportData() {
        JSONObject handlers = new JSONObject(), groups = new JSONObject();
        try {
            synchronized (GROUP_MAP) {
                for (Object group : GROUP_MAP.values()) {
                    int groupIdValue = (int) groupId.get(group);
                    List<Object> groupHandlers = (List<Object>) Profiler.groupHandlers.get(group);
                    groups.put(String.valueOf(groupIdValue), groupName.get(group));
                    synchronized (groupHandlers) {
                        for (Object id : groupHandlers) {
                            if (!((boolean) isTimed.invoke(id)) && !((boolean) isSpecial.invoke(id))) continue;
                            String name = (String) identifierName.get(identifier.get(id));
                            if (name.startsWith("##"))
                                name = name.substring(3);
                            handlers.put(String.valueOf((int) handlerId.get(id)), new Object[] { groupIdValue, name });
                        }
                    }
                }
            }
            JSONObject json = new JSONObject();
            json.put("data", ((Map<String, Object>) export.invoke(Utils.sync(timingHistory::newInstance))).get("h"));
            json.put("handlers", handlers);
            json.put("groups", groups);
            return json;
        } catch (Throwable e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }
}
