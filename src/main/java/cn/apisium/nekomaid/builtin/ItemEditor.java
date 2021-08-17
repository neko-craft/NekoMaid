package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import org.bukkit.Material;
import org.bukkit.enchantments.Enchantment;

import java.util.Arrays;

final class ItemEditor {
    private final static String[] data = new String[2];
    static {
        data[0] = Utils.serializeToString(Arrays.stream(Material.values()).map(Enum::name).toArray());
        try {
            data[1] = Utils.serializeToString(Arrays.stream(Enchantment.values()).map(it -> it.getKey().toString()).toArray());
        } catch (Throwable ignored) {
            data[1] = Utils.serializeToString(new String[0]);
        }
    }
    public static void init(NekoMaid main) {
        main.GLOBAL_DATA.put("hasNBTAPI", true);
        main.onConnected(main, client -> client.onWithMultiArgsAck("item:fetch", () -> data));
    }
}
