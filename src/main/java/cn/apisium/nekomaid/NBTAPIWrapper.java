package cn.apisium.nekomaid;

import de.tr7zw.nbtapi.NBTContainer;
import de.tr7zw.nbtapi.NBTTileEntity;
import org.bukkit.block.BlockState;

public class NBTAPIWrapper {
    public static NBTContainer createNBTContainer(String value) {
        return new NBTContainer(value);
    }
    public static String serializeBlockState(BlockState state) {
        return new NBTTileEntity(state).toString();
    }
}
