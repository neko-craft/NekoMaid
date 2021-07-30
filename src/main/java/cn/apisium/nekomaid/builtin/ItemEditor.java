package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import org.bukkit.Material;

import java.util.Arrays;

final class ItemEditor {
    private final static String types = Utils.serializeToString(Arrays.stream(Material.values()).map(Enum::name).toArray());
    public static void initItemEditor(NekoMaid main) {
        main.GLOBAL_DATA.put("hasNBTAPI", true);
        main.onConnected(main, client -> client.onWithAck("item:fetch", () -> types));
    }
}
