package cn.apisium.nekomaid;

import de.tr7zw.nbtapi.NBTContainer;
import de.tr7zw.nbtapi.NBTItem;
import de.tr7zw.nbtapi.NBTTileEntity;
import org.bukkit.block.BlockState;
import org.bukkit.inventory.ItemStack;

import java.lang.reflect.Constructor;

public class NBTAPIWrapper {
    private static Constructor<NBTContainer> nbtContainer;
    private static Constructor<NBTTileEntity> nbtTileEntity;
    public static ItemStack convertNBTtoItem(String value) {
        try {
            if (nbtContainer == null) nbtContainer = NBTContainer.class.getConstructor(String.class);
            return NBTItem.convertNBTtoItem(nbtContainer.newInstance(value));
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }
    public static String serializeBlockState(BlockState state) {
        try {
            if (nbtTileEntity == null) nbtTileEntity = NBTTileEntity.class.getConstructor(BlockState.class);
            return nbtTileEntity.newInstance(state).toString();
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }
}
