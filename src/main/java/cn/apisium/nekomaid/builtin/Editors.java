package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.*;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.BlockState;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.inventory.BlockInventoryHolder;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.jetbrains.annotations.NotNull;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class Editors {
    private final static String SUCCESS = ChatColor.translateAlternateColorCodes('&',
            "&e[NekoMaid] &aSuccess! &bOr you can click this url: &7");
    private final static String[] blockCommandUsages = new String[] { "", "<worlds> <x> <y> <z>" };
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
    static {
        try {
            Class<?> clazz = org.bukkit.block.Block.class.getMethod("getBlockData").getReturnType();
            clazz.getMethod("getAsString");
            hasBlockData = true;
        } catch (Throwable ignored) { }
    }

    private final NekoMaid main;

    public Editors(NekoMaid main) {
        this.main = main;
        main.onConnected(main, client -> client
                .onWithMultiArgsAck("item:fetch", () -> data)
                .onWithMultiArgsAck("item:blocks", () -> new Object[] { blocks, getWorldNames().toArray() })
                .onWithAck("block:fetch", (Function<Object[], Block>) args -> Utils.sync(() -> {
                    try {
                        World world = main.getServer().getWorld((String) args[0]);
                        if (world == null) return null;
                        org.bukkit.block.Block block = world.getBlockAt((int) args[1], (int) args[2], (int) args[3]);
                        Block b = new Block();
                        b.type = block.getType().name();
                        BlockState state = block.getState();
                        if (Utils.hasNBTAPI()) b.data = NBTAPIWrapper.newNBTTileEntity(state).toString();
                        else if (hasBlockData) b.data = state.getBlockData().getAsString();
                        if (state instanceof BlockInventoryHolder) {
                            Inventory inv = ((BlockInventoryHolder) state).getInventory();
                            b.inventory = ItemData.fromInventory(inv);
                            b.inventoryType = inv.getType().name();
                        }
                        return b;
                    } catch (Throwable e) {
                        e.printStackTrace();
                        return null;
                    }
                })).onWithAck("block:type", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
                    World world = main.getServer().getWorld((String) args[0]);
                    if (world != null) try {
                        world.getBlockAt((int) args[1], (int) args[2], (int) args[3])
                                .setType(Objects.requireNonNull(Material.getMaterial((String) args[4])));
                        return true;
                    } catch (Throwable e) { e.printStackTrace(); }
                    return false;
                })).onWithAck("block:data", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
                    World world = main.getServer().getWorld((String) args[0]);
                    if (world != null) try {
                        org.bukkit.block.Block b = world.getBlockAt((int) args[1], (int) args[2], (int) args[3]);
                        if (Utils.hasNBTAPI()) NBTAPIWrapper.mergeTileEntity(b.getState(), (String) args[4]);
                        else b.setBlockData(main.getServer().createBlockData((String) args[4]));
                        return true;
                    } catch (Throwable e) { e.printStackTrace(); }
                    return false;
                })).onWithAck("block:setItem", args -> {
                    World world = main.getServer().getWorld((String) args[0]);
                    if (world != null) try {
                        BlockState state = world.getBlockAt((int) args[1], (int) args[2], (int) args[3]).getState();
                        if (state instanceof BlockInventoryHolder) {
                            Inventory inv = ((BlockInventoryHolder) state).getInventory();
                            int to = (int) args[4], from = (int) args[6];
                            ItemStack is = inv.getItem(to);
                            String data = (String) args[5];
                            inv.setItem(to, data == null ? null : ItemData.fromString(data).getItemStack());
                            if (from != -1 && is != null) inv.setItem(from, is);
                            return true;
                        }
                    } catch (Throwable e) { e.printStackTrace(); }
                    return false;
                })
        ).registerCommand(main, "block", new NekoMaidCommand() {
            @Override
            public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                                     @NotNull String label, @NotNull String[] args) {
                if (args.length == 0) {
                    if (sender instanceof Player) {
                        org.bukkit.block.Block block = ((Player) sender).getTargetBlockExact(8);
                        if (block != null) {
                            sender.sendMessage(selectBlock(block));
                            return true;
                        }
                    }
                } else if (args.length == 4) try {
                    sender.sendMessage(selectBlock(Objects.requireNonNull(main.getServer().getWorld(args[0]))
                            .getBlockAt(Integer.parseInt(args[1]), Integer.parseInt(args[2]), Integer.parseInt(args[3]))));
                    return true;
                } catch (Throwable ignored) { }
                return false;
            }

            @Override
            public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                                       @NotNull String alias, @NotNull String[] args) {
                if (args.length < 2) return getWorldNames().collect(Collectors.toList());
                if (!(sender instanceof Player)) return Collections.emptyList();
                org.bukkit.block.Block block = ((Player) sender).getTargetBlockExact(8);
                Location loc = block == null ? ((Player) sender).getLocation().toBlockLocation() : block.getLocation();
                switch (args.length) {
                    case 2: return Collections.singletonList(String.valueOf((int) loc.getX()));
                    case 3: return Collections.singletonList(String.valueOf((int) loc.getY()));
                    case 4: return Collections.singletonList(String.valueOf((int) loc.getZ()));
                    default: return Collections.emptyList();
                }
            }

            @Override
            public String[] getUsages() { return blockCommandUsages; }
        });
    }

    private static class Block {
        public String type, data, inventoryType;
        public ItemData[] inventory;
    }

    private Stream<String> getWorldNames() { return main.getServer().getWorlds().stream().map(World::getName); }
    private String selectBlock(org.bukkit.block.Block block) {
        main.broadcastInPage(main, "block", "block:select",
                block.getWorld().getName(), block.getX(), block.getY(), block.getZ());
        return SUCCESS + main.getConnectUrl() + "#/NekoMaid/block/" + block.getWorld().getName() + "/" +
                block.getX() + "/" + block.getY() + "/" + block.getZ();
    }
}
