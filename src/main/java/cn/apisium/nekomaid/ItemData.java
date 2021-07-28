package cn.apisium.nekomaid;

import de.tr7zw.nbtapi.NBTItem;
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.inventory.meta.PotionMeta;

public class ItemData {
    public String type, name, icon;
    public int amount;
    public boolean hasEnchants;
    public String nbt;

    @SuppressWarnings("deprecation")
    public ItemData(ItemStack is) {
        type = is.getType().name();
        icon = getIcon(is.getType());
        ItemMeta im = is.getItemMeta();
        if (im.hasDisplayName()) name = im.getDisplayName();
        amount = is.getAmount();
        hasEnchants = hasEnhance(is);
        if (Utils.HAS_NBT_API) nbt = new NBTItem(is).toString();
    }

    private static String getIcon(Material type) {
        switch (type) {
            case DEBUG_STICK: return "stick";
            case ENCHANTED_GOLDEN_APPLE: return "golden_apple";
            case TIPPED_ARROW: return "arrow";
            default: return null;
        }
    }

    private static boolean hasEnhance(ItemStack is) {
        if (is.getItemMeta().hasEnchants()) return true;
        switch (is.getType()) {
            case ENCHANTED_BOOK:
            case ENCHANTED_GOLDEN_APPLE:
            case DEBUG_STICK: return true;
            case SPLASH_POTION:
            case LINGERING_POTION:
            case POTION: return ((PotionMeta) is.getItemMeta()).hasColor();
            default: return false;
        }
    }
}
