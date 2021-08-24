package cn.apisium.nekomaid;

import de.tr7zw.nbtapi.NBTCompound;
import de.tr7zw.nbtapi.NBTContainer;
import de.tr7zw.nbtapi.NBTTileEntity;
import org.bukkit.block.BlockState;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

public final class NBTAPIWrapper {
    private static Constructor<NBTContainer> nbtContainer;
    private static Constructor<NBTTileEntity> nbtTileEntity;
    private static Method mergeCompound;

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

    public static void mergeTileEntity(BlockState state, String nbt) {
        try {
            if (mergeCompound == null) mergeCompound = NBTTileEntity
                    .class.getMethod("mergeCompound", NBTCompound.class);
            mergeCompound.invoke(newNBTTileEntity(state), newNBTContainer(nbt));
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }
}
