package cn.apisium.nekomaid.builtin;

import org.bukkit.Server;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.conversations.Conversation;
import org.bukkit.conversations.ConversationAbandonedEvent;
import org.bukkit.permissions.Permission;
import org.bukkit.permissions.PermissionAttachment;
import org.bukkit.permissions.PermissionAttachmentInfo;
import org.bukkit.plugin.Plugin;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.Set;
import java.util.UUID;

final class ConsoleCommandSenderProxy implements ConsoleCommandSender {
    private final ConsoleCommandSender o;
    public ConsoleCommandSenderProxy(ConsoleCommandSender sender) {
        o = sender;
    }

    @Override
    public void sendMessage(@NotNull String message) {
        o.sendMessage(message);
    }

    @Override
    public void sendMessage(@NotNull String[] messages) {
        o.sendMessage(messages);
    }

    @Override
    public void sendMessage(@Nullable UUID sender, @NotNull String message) {
        o.sendMessage(sender, message);
    }

    @Override
    public void sendMessage(@Nullable UUID sender, @NotNull String[] messages) {
        o.sendMessage(sender, messages);
    }

    @Override
    public @NotNull Server getServer() {
        return o.getServer();
    }

    @Override
    public @NotNull String getName() {
        return o.getName();
    }

    @Override
    public @NotNull Spigot spigot() {
        return o.spigot();
    }

    @Override
    public boolean isConversing() {
        return o.isConversing();
    }

    @Override
    public void acceptConversationInput(@NotNull String input) {
        o.acceptConversationInput(input);
    }

    @Override
    public boolean beginConversation(@NotNull Conversation conversation) {
        return o.beginConversation(conversation);
    }

    @Override
    public void abandonConversation(@NotNull Conversation conversation) {
        o.abandonConversation(conversation);
    }

    @Override
    public void abandonConversation(@NotNull Conversation conversation, @NotNull ConversationAbandonedEvent details) {
        o.abandonConversation(conversation, details);
    }

    @Override
    public void sendRawMessage(@NotNull String message) {
        o.sendRawMessage(message);
    }

    @Override
    public void sendRawMessage(@Nullable UUID sender, @NotNull String message) {
        o.sendRawMessage(sender, message);
    }

    @Override
    public boolean isPermissionSet(@NotNull String name) {
        return o.isPermissionSet(name);
    }

    @Override
    public boolean isPermissionSet(@NotNull Permission perm) {
        return o.isPermissionSet(perm);
    }

    @Override
    public boolean hasPermission(@NotNull String name) {
        return o.hasPermission(name);
    }

    @Override
    public boolean hasPermission(@NotNull Permission perm) {
        return o.hasPermission(perm);
    }

    @Override
    public @NotNull PermissionAttachment addAttachment(@NotNull Plugin plugin, @NotNull String name, boolean value) {
        return o.addAttachment(plugin, name, value);
    }

    @Override
    public @NotNull PermissionAttachment addAttachment(@NotNull Plugin plugin) {
        return o.addAttachment(plugin);
    }

    @Override
    public @Nullable PermissionAttachment addAttachment(@NotNull Plugin plugin, @NotNull String name, boolean value, int ticks) {
        return o.addAttachment(plugin, name, value, ticks);
    }

    @Override
    public @Nullable PermissionAttachment addAttachment(@NotNull Plugin plugin, int ticks) {
        return o.addAttachment(plugin, ticks);
    }

    @Override
    public void removeAttachment(@NotNull PermissionAttachment attachment) {
        o.removeAttachment(attachment);
    }

    @Override
    public void recalculatePermissions() {
        o.recalculatePermissions();
    }

    @Override
    public @NotNull Set<PermissionAttachmentInfo> getEffectivePermissions() {
        return o.getEffectivePermissions();
    }

    @Override
    public boolean isOp() {
        return o.isOp();
    }

    @Override
    public void setOp(boolean value) {
        o.setOp(value);
    }
}
