package cn.apisium.nekomaid.utils;

import com.alibaba.fastjson2.JSONObject;
import org.bukkit.Bukkit;
import org.bukkit.plugin.SimplePluginManager;
import org.spigotmc.CustomTimingsHandler;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Queue;

@SuppressWarnings({"deprecation", "JavaReflectionMemberAccess", "unchecked"})
public final class TimingsV1 implements cn.apisium.nekomaid.utils.Timings {
    private static final Queue<CustomTimingsHandler> HANDLERS;
    private static final Field parent, name, count, totalTime;
    static {
        try {
            Field field = CustomTimingsHandler.class.getDeclaredField("HANDLERS");
            field.setAccessible(true);
            HANDLERS = (Queue<CustomTimingsHandler>) field.get(null);
            parent = CustomTimingsHandler.class.getDeclaredField("parent");
            name = CustomTimingsHandler.class.getDeclaredField("name");
            count = CustomTimingsHandler.class.getDeclaredField("count");
            totalTime = CustomTimingsHandler.class.getDeclaredField("totalTime");
            parent.setAccessible(true);
            name.setAccessible(true);
            count.setAccessible(true);
            totalTime.setAccessible(true);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void setEnable(boolean flag) { ((SimplePluginManager) Bukkit.getPluginManager()).useTimings(flag); }

    @Override
    public boolean isStarted() { return Bukkit.getPluginManager().useTimings(); }

    @SuppressWarnings("SuspiciousMethodCalls")
    @Override
    public JSONObject exportData() {
        try {
            JSONObject handlers = new JSONObject();
            HashMap<CustomTimingsHandler, Object[]> handlersMap = new HashMap<>();
            int i = 0;
            Object[] root = null;
            for (CustomTimingsHandler it : HANDLERS) {
                long c = (long) count.get(it), t = (long) totalTime.get(it);
                if (c != 0 && t != 0) {
                    Object[] arr = new Object[] { ++i, c, t, null };
                    if (i == 1) root = arr;
                    String n = (String) name.get(it);
                    handlersMap.put(it, arr);
                    handlers.put(String.valueOf(i), n.startsWith("** ") ?
                            new Object[]{ 0, n.substring(3) } : new Object[] { 1, n });
                }
            }
            for (CustomTimingsHandler it : HANDLERS) {
                Object[] cur = handlersMap.get(it);
                if (cur == null || cur == root) continue;
                Object p = parent.get(it);
                Object[] arr;
                if (p == null) {
                    arr = root;
                } else {
                    arr = handlersMap.get(p);
                    if (arr == null) continue;
                }
                if (arr == null) continue;
                if (arr[3] == null) arr[3] = new ArrayList<>();
                ((ArrayList<Object[]>) arr[3]).add(new Object[] { cur[0], cur[1], cur[2] });
            }
            JSONObject json = new JSONObject();
            json.put("data", handlersMap.values());
            json.put("handlers", handlers);
            json.put("groups", new String[] { "Minecraft", "" });
            return json;
        } catch (Throwable e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }
}
