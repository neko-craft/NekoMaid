package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.*;
import cn.apisium.nekomaid.utils.ItemData;
import cn.apisium.nekomaid.utils.NBTAPIWrapper;
import cn.apisium.nekomaid.utils.Utils;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.BlockState;
import org.bukkit.block.Block;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Entity;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.inventory.BlockInventoryHolder;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;
import org.jetbrains.annotations.NotNull;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class Editors {
    private final static String SUCCESS = ChatColor.translateAlternateColorCodes('&',
            "&e[NekoMaid] &aSuccess! &bOr you can click this url: &7");
    private final static String[] blockCommandUsages = new String[] { "", "<worlds> <x> <y> <z>" },
            entityCommandUsages = new String[] { "", "<uuid>" };
    private final static String[] data = new String[2];
    private final static String blocks;
    private static boolean hasBlockData, hasTargetEntity, hasTargetBlockExact;
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
            Class<?> clazz = Block.class.getMethod("getBlockData").getReturnType();
            clazz.getMethod("getAsString");
            hasBlockData = true;
        } catch (Throwable ignored) { }
        try {
            LivingEntity.class.getMethod("getTargetEntity", int.class);
            hasTargetEntity = true;
        } catch (Throwable ignored) { }
        try {
            LivingEntity.class.getMethod("getTargetBlockExact", int.class);
            hasTargetBlockExact = true;
        } catch (Throwable ignored) { }
    }

    private final NekoMaid main;

    public Editors(NekoMaid main) {
        this.main = main;
        main.onConnected(main, client -> {
            client
                    .onWithMultiArgsAck("item:fetch", () -> data)
                    .onWithMultiArgsAck("item:blocks", () -> new Object[] { blocks, getWorldNames().toArray() })
                    .onWithAck("block:fetch", (Function<Object[], BlockInfo>) args -> Utils.sync(() -> {
                        try {
                            World world = main.getServer().getWorld((String) args[0]);
                            if (world == null) return null;
                            Block block = world.getBlockAt((int) args[1], (int) args[2], (int) args[3]);
                            BlockInfo b = new BlockInfo();
                            b.type = block.getType().name();
                            BlockState state = block.getState();
                            if (Utils.hasNBTAPI()) try {
                                b.nbt = NBTAPIWrapper.newNBTTileEntity(state).toString();
                            } catch (Throwable ignored) { }
                            if (hasBlockData) b.data = state.getBlockData().getAsString();
                            try {
                                if (state instanceof BlockInventoryHolder) {
                                    Inventory inv = ((BlockInventoryHolder) state).getInventory();
                                    b.inventory = ItemData.fromInventory(inv);
                                    b.inventoryType = inv.getType().name();
                                }
                            } catch (NoClassDefFoundError ignore) { }
                            return b;
                        } catch (Throwable e) {
                            e.printStackTrace();
                            return null;
                        }
                    })).onWithAck("block:type", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
                World world = main.getServer().getWorld((String) args[0]);
                if (world != null) try {
                    Block b = world.getBlockAt((int) args[1], (int) args[2], (int) args[3]);
                    BlockState state = b.getState();
                    ItemStack[] contents = state instanceof BlockInventoryHolder
                            ? ((BlockInventoryHolder) state).getInventory().getContents()
                            : null;
                    b.setType(Objects.requireNonNull(Material.getMaterial((String) args[4])));
                    state = b.getState();
                    if (state instanceof BlockInventoryHolder && contents != null) {
                        Inventory inv = ((BlockInventoryHolder) state).getInventory();
                        inv.setContents(Arrays.copyOf(contents, inv.getSize()));
                    }
                    return true;
                } catch (Throwable e) { e.printStackTrace(); }
                return false;
            })).onWithAck("block:save", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
                World world = main.getServer().getWorld((String) args[0]);
                if (world != null) try {
                    Block b = world.getBlockAt((int) args[1], (int) args[2], (int) args[3]);
                    BlockState state = b.getState();
                    if (Utils.hasNBTAPI() && args[4] != null) try {
                        NBTAPIWrapper.mergeCompound(NBTAPIWrapper.newNBTTileEntity(state), (String) args[4]);
                    } catch (Throwable e) { e.printStackTrace(); }
                    if (hasBlockData && args[5] != null)
                        state.setBlockData(main.getServer().createBlockData((String) args[5]));
                    return true;
                } catch (Throwable e) { e.printStackTrace(); }
                return false;
            })).onWithAck("block:setItem", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
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
            })).onWithAck("entity:fetch", (Function<Object[], EntityInfo>) args -> Utils.sync(() -> {
                try {
                    Entity entity = main.getServer().getEntity(UUID.fromString((String) args[0]));
                    if (entity == null) return null;
                    EntityInfo e = new EntityInfo();
                    if (Utils.hasNBTAPI()) try {
                        e.nbt = NBTAPIWrapper.newNBTEntity(entity).toString();
                    } catch (Throwable ignored) { }
                    e.type = entity.getType().name();
                    e.customName = entity.getCustomName();
                    e.customNameVisible = entity.isCustomNameVisible();
                    e.glowing = entity.isGlowing();
                    e.gravity = entity.hasGravity();
                    e.invulnerable = entity.isInvulnerable();
                    e.silent = entity.isSilent();
                    if (entity instanceof InventoryHolder) {
                        Inventory inv = ((InventoryHolder) entity).getInventory();
                        e.inventory = ItemData.fromInventory(inv);
                        e.inventoryType = inv.getType().name();
                    }
                    return e;
                } catch (Throwable e) {
                    e.printStackTrace();
                    return null;
                }
            })).onWithAck("entity:setItem", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
                Entity entity = main.getServer().getEntity(UUID.fromString((String) args[0]));
                if (entity instanceof InventoryHolder) try {
                    Inventory inv = ((InventoryHolder) entity).getInventory();
                    int to = (int) args[1], from = (int) args[3];
                    ItemStack is = inv.getItem(to);
                    String data = (String) args[2];
                    inv.setItem(to, data == null ? null : ItemData.fromString(data).getItemStack());
                    if (from != -1 && is != null) inv.setItem(from, is);
                    return true;
                } catch (Throwable e) { e.printStackTrace(); }
                return false;
            })).onWithAck("entity:set", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
                Entity entity = main.getServer().getEntity(UUID.fromString((String) args[0]));
                if (entity != null) {
                    boolean value = (boolean) args[2];
                    switch ((String) args[1]) {
                        case "customNameVisible": entity.setCustomNameVisible(value); return true;
                        case "glowing": entity.setGlowing(value); return true;
                        case "gravity": entity.setGravity(value); return true;
                        case "invulnerable": entity.setInvulnerable(value); return true;
                        case "silent": entity.setSilent(value); return true;
                    }
                }
                return false;
            }));
            if (Utils.hasNBTAPI()) {
                client.onWithAck("entity:save", (Function<Object[], Boolean>) args -> Utils.sync(() -> {
                    Entity entity = main.getServer().getEntity(UUID.fromString((String) args[0]));
                    if (entity != null) {
                        if (args[1] != null) try {
                            NBTAPIWrapper.mergeCompound(NBTAPIWrapper.newNBTEntity(entity), (String) args[1]);
                        } catch (Throwable e) { e.printStackTrace(); }
                        entity.setCustomName((String) args[2]);
                        return true;
                    }
                    return false;
                }));
            }
        }).registerCommand(main, "block", new NekoMaidCommand() {
            @Override
            public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                                     @NotNull String label, @NotNull String[] args) {
                if (args.length == 0) {
                    if (sender instanceof Player) {
                        Player p = (Player) sender;
                        Block block = hasTargetBlockExact ? p.getTargetBlockExact(8)
                                : p.getTargetBlock(null, 8);
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
                Player p = (Player) sender;
                Block block = hasTargetBlockExact ? p.getTargetBlockExact(8)
                        : p.getTargetBlock(null, 8);
                Location loc = block == null ? p.getLocation().toBlockLocation() : block.getLocation();
                switch (args.length) {
                    case 2: return Collections.singletonList(String.valueOf((int) loc.getX()));
                    case 3: return Collections.singletonList(String.valueOf((int) loc.getY()));
                    case 4: return Collections.singletonList(String.valueOf((int) loc.getZ()));
                    default: return Collections.emptyList();
                }
            }

            @Override
            public String[] getUsages() { return blockCommandUsages; }
        }).registerCommand(main, "entity", new NekoMaidCommand() {
            @Override
            public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                                     @NotNull String label, @NotNull String[] args) {
                if (hasTargetEntity && args.length == 0) {
                    if (sender instanceof Player) {
                        Player p = (Player) sender;
                        Entity entity = p.getTargetEntity(8);
                        if (entity != null) {
                            sender.sendMessage(selectEntity(entity));
                            return true;
                        }
                    }
                } else if (args.length == 1) try {
                    sender.sendMessage(selectEntity(Objects.requireNonNull(main.getServer()
                            .getEntity(UUID.fromString(args[0])))));
                    return true;
                } catch (Throwable ignored) { }
                return false;
            }

            @Override
            public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                              @NotNull String alias, @NotNull String[] args) {
                if (!(sender instanceof Player)) return Collections.emptyList();
                Player p = (Player) sender;
                Entity entity = null;
                if (hasTargetEntity) entity = p.getTargetEntity(8);
                if (entity == null) {
                    List<Entity> list = p.getNearbyEntities(4, 4, 4);
                    if (!list.isEmpty()) entity = list.get(0);
                }
                return entity == null ? Collections.emptyList()
                        : Collections.singletonList(entity.getUniqueId().toString());
            }

            @Override
            public String[] getUsages() { return entityCommandUsages; }
        });
    }

    private static class BlockInfo {
        public String type, nbt, data, inventoryType;
        public ItemData[] inventory;
    }
    private static class EntityInfo {
        public String type, customName, nbt, inventoryType;
        public boolean customNameVisible, glowing, gravity, invulnerable, silent;
        public ItemData[] inventory;
    }

    private Stream<String> getWorldNames() { return main.getServer().getWorlds().stream().map(World::getName); }
    private String selectBlock(Block block) {
        main.broadcastInPage(main, "block", "block:select",
                block.getWorld().getName(), block.getX(), block.getY(), block.getZ());
        return SUCCESS + main.getConnectUrl() + "#/NekoMaid/block/" + block.getWorld().getName() + "/" +
                block.getX() + "/" + block.getY() + "/" + block.getZ();
    }
    private String selectEntity(Entity entity) {
        String id = entity.getUniqueId().toString();
        main.broadcastInPage(main, "entity", "entity:select", id);
        return SUCCESS + main.getConnectUrl() + "#/NekoMaid/entity/" + id;
    }
}
