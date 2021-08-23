package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NBTAPIWrapper;
import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.enchantments.Enchantment;

import java.util.Arrays;

final class Editors {
    private final static String[] data = new String[2];
    private final static String blocks;
    private static boolean hasBlockData;
    static {
        Material[] arr = Material.values();
        data[0] = Utils.serializeToString(Arrays.stream(arr).map(Enum::name).toArray());
        try {
            data[1] = Utils.serializeToString(Arrays.stream(Enchantment.values()).map(it -> it.getKey().toString()).toArray());
        } catch (Throwable ignored) {
            data[1] = Utils.serializeToString(new String[0]);
        }
        blocks = Utils.serializeToString(Arrays.stream(arr).filter(Material::isBlock).map(Enum::name).toArray());
    }
    public static class Block {
        public String type, nbt, data;
    }
    static {
        try {
            Class<?> clazz = org.bukkit.block.Block.class.getMethod("getBlockData").getReturnType();
            clazz.getMethod("getAsString");
            hasBlockData = true;
        } catch (Throwable ignored) { }
    }
    public static void init(NekoMaid main) {
        main.onConnected(main, client -> client
                .onWithMultiArgsAck("item:fetch", () -> data)
                .onWithAck("item:blocks", () -> blocks)
                .onWithAck("block:fetch", args -> {
                    World world = main.getServer().getWorld((String) args[0]);
                    if (world == null) return null;
                    org.bukkit.block.Block block = world.getBlockAt((int) args[1], 0, 0);
                    Block b = new Block();
                    b.type = block.getType().name();
                    if (hasBlockData) b.data = block.getBlockData().getAsString();
                    if (Utils.hasNBTAPI()) b.nbt = NBTAPIWrapper.serializeBlockState(block.getState());
                    return b;
                })
        );
    }
}
