package cn.apisium.nekomaid;

import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.Collections;
import java.util.List;

public interface NekoMaidCommand extends TabExecutor {
    @Nullable
    default String[] getUsages() {
        return null;
    }

    @Nullable
    default List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                       @NotNull String alias, @NotNull String[] args) {
        return Collections.emptyList();
    }
}
