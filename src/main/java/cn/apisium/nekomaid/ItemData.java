package cn.apisium.nekomaid;

import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;

import java.util.List;

public class ItemData {
    public String type, name;
    public int amount;
    public List<String> lore;
    public boolean hasEnchants;

    @SuppressWarnings("deprecation")
    public ItemData(ItemStack is) {
        type = is.getType().name();
        ItemMeta im = is.getItemMeta();
        if (im.hasDisplayName()) name = im.getDisplayName();
        amount = is.getAmount();
        if (im.hasLore()) lore = im.getLore();
        hasEnchants = im.hasEnchants();
    }
}
