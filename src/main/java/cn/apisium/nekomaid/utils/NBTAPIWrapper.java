package cn.apisium.nekomaid.utils;

import de.tr7zw.nbtapi.*;
import org.bukkit.block.BlockState;
import org.bukkit.entity.Entity;
import org.bukkit.inventory.ItemStack;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

public final class NBTAPIWrapper {
    private static Constructor<NBTContainer> nbtContainer;
    private static Constructor<NBTTileEntity> nbtTileEntity;
    private static Constructor<NBTEntity> nbtEntity;
    private static Method mergeCompound;

    public static ItemStack convertNBTtoItem(String nbt) {
        return NBTItem.convertNBTtoItem(NBTAPIWrapper.newNBTContainer(nbt));
    }

    public static NBTContainer newNBTContainer(String value) {
        try {
            if (nbtContainer == null) nbtContainer = NBTContainer.class.getConstructor(String.class);
            return nbtContainer.newInstance(value);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }

    public static NBTTileEntity newNBTTileEntity(BlockState state) {
        try {
            if (nbtTileEntity == null) nbtTileEntity = NBTTileEntity.class.getConstructor(BlockState.class);
            return nbtTileEntity.newInstance(state);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }

    public static NBTEntity newNBTEntity(Entity entity) {
        try {
            if (nbtEntity == null) nbtEntity = NBTEntity.class.getConstructor(Entity.class);
            return nbtEntity.newInstance(entity);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }

    public static void mergeCompound(Object obj, String nbt) {
        try {
            if (mergeCompound == null) mergeCompound = NBTCompound
                    .class.getMethod("mergeCompound", NBTCompound.class);
            mergeCompound.invoke(obj, newNBTContainer(nbt));
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }
}
