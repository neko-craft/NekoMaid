package cn.apisium.nekomaid;

import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.annotation.JSONField;
import de.tr7zw.nbtapi.NBTContainer;
import de.tr7zw.nbtapi.NBTItem;
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.inventory.meta.PotionMeta;

import java.util.Objects;

@SuppressWarnings({"FieldMayBeFinal", "FieldCanBeLocal", "unused"})
public class ItemData {
    public String type, name, icon;
    public int amount;
    public boolean hasEnchants;
    public String nbt;
    @JSONField(serialize=false)
    private ItemStack itemStack;

    @SuppressWarnings("deprecation")
    public ItemData(ItemStack is) {
        Objects.requireNonNull(is);
        itemStack = is;
        type = is.getType().name();
        icon = getIcon(is.getType());
        ItemMeta im = is.getItemMeta();
        if (im.hasDisplayName()) name = im.getDisplayName();
        amount = is.getAmount();
        hasEnchants = hasEnhance(is);
        if (Utils.HAS_NBT_API) nbt = NBTItem.convertItemtoNBT(is).toString();
    }

    private ItemData() { }

    public static ItemData fromString(String str) {
        return JSONObject.parseObject(str, ItemData.class);
    }

    public int getAmount() { return amount; }

    public ItemStack getItemStack() {
        if (itemStack == null) {
            Material t = Material.getMaterial(type);
            Objects.requireNonNull(t);
            itemStack = Utils.HAS_NBT_API && nbt != null ? NBTItem.convertNBTtoItem(new NBTContainer(nbt))
                    : new ItemStack(t, amount);
            if (itemStack.getAmount() != amount) itemStack.setAmount(amount);
        }
        return itemStack;
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
