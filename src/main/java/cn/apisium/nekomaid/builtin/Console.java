package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import com.google.common.collect.EvictingQueue;
import net.md_5.bungee.api.chat.BaseComponent;
import net.md_5.bungee.api.chat.TextComponent;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.*;
import org.apache.logging.log4j.core.appender.DefaultErrorHandler;
import org.apache.logging.log4j.core.filter.LevelRangeFilter;
import org.apache.logging.log4j.core.layout.AbstractStringLayout;
import org.apache.logging.log4j.core.layout.PatternLayout;
import org.apache.logging.log4j.message.Message;
import org.apache.logging.log4j.message.SimpleMessage;
import org.bukkit.Server;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.conversations.Conversation;
import org.bukkit.conversations.ConversationAbandonedEvent;
import org.bukkit.permissions.Permission;
import org.bukkit.permissions.PermissionAttachment;
import org.bukkit.permissions.PermissionAttachmentInfo;
import org.bukkit.plugin.Plugin;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.Serializable;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.FutureTask;

@SuppressWarnings("UnstableApiUsage")
final class Console implements Appender {
    private static final org.apache.logging.log4j.Logger logger = org.apache.logging.log4j.LogManager.getRootLogger();
    private final LevelRangeFilter filter;
    private ErrorHandler handler = new DefaultErrorHandler(this);
    private final NekoMaid main;
    private final EvictingQueue<Log> queue = EvictingQueue.create(100);
    private final AbstractStringLayout.Serializer serializer = PatternLayout.newSerializerBuilder()
            .setPattern("%msg%xEx{full}").setDisableAnsi(true).build();

    public Console(NekoMaid main) {
        this.main = main;
        filter = LevelRangeFilter.createFilter(
                Level.getLevel(main.getConfig().getString("logger.minLevel", "OFF")),
                Level.getLevel(main.getConfig().getString("logger.maxLevel", "INFO")),
                null, null
        );
        ProxiedConsoleCommandSender sender = new ProxiedConsoleCommandSender(main.getServer().getConsoleSender());
        main.onSwitchPage(main, "console", client -> client.emit("console:logs", queue))
                .onConnected(main, client -> client.onWithAck("console:complete", Utils::complete)
                        .onWithAck("console:run", args -> {
                            String command = (String) args[0];
                            FutureTask<Boolean> future = new FutureTask<>(() -> {
                                main.getLogger().info("NekoMaid issued server command: /" + command);
                                try {
                                    return main.getServer()
                                            .dispatchCommand(sender, command);
                                } catch (Throwable e) {
                                    e.printStackTrace();
                                    return false;
                                }
                            });
                            main.getServer().getScheduler().runTask(main, future);
                            try {
                                return future.get();
                            } catch (Throwable ignored) {
                                return false;
                            }
                        }));
        ((Logger) LogManager.getRootLogger()).addAppender(this);
    }

    @Override
    public void append(LogEvent e) {
        if (filter.filter(e) == filter.getOnMismatch()) return;
        Log obj = new Log();
        obj.time = e.getTimeMillis();
        if (e.getMessage() instanceof ComponentMessage) {
            obj.time = new Date().getTime();
            obj.components = ((ComponentMessage) e.getMessage()).components;
        } else {
            obj.msg = serializer.toSerializable(e);
            obj.level = e.getLevel().name();
            obj.logger = e.getLoggerName();
        }
        queue.add(obj);
        main.broadcastInPage(main, "console", "console:log", obj);
    }

    @Override
    public String getName() {
        return "NekoMaid";
    }

    @Override
    public Layout<Serializable> getLayout() {
        return null;
    }

    @Override
    public boolean ignoreExceptions() {
        return true;
    }

    @Override
    public ErrorHandler getHandler() {
        return handler;
    }

    @Override
    public void setHandler(ErrorHandler handler) {
        this.handler = handler;
    }

    @Override
    public State getState() {
        return State.STARTED;
    }

    @Override
    public void initialize() {}

    @Override
    public void start() { }

    @Override
    public void stop() {
        ((Logger) LogManager.getRootLogger()).removeAppender(this);
    }

    @Override
    public boolean isStarted() {
        return true;
    }

    @Override
    public boolean isStopped() {
        return false;
    }

    private static class Log {
        public String msg, level, logger;
        public long time;
        public BaseComponent[] components = null;
    }

    private static final class ComponentMessage extends SimpleMessage {
        public BaseComponent[] components;
        public ComponentMessage(BaseComponent ...components) {
            super(TextComponent.toLegacyText(components));
            this.components = components;
        }
    }

    private static final class ProxiedConsoleCommandSender implements ConsoleCommandSender {
        private final ConsoleCommandSender o;
        private final ProxiedConsoleCommandSender.ProxiedSpigot spigot = new ProxiedSpigot();
        public ProxiedConsoleCommandSender(ConsoleCommandSender sender) {
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
        public @NotNull Spigot spigot() { return spigot; }

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

        @SuppressWarnings("deprecation")
        public static class ProxiedSpigot extends CommandSender.Spigot {
            public void sendMessage(@NotNull BaseComponent component) {
                sendMessage(new BaseComponent[] { component });
            }

            public void sendMessage(BaseComponent... components) {
                logger.info((Message) new ComponentMessage(components));
            }

            public void sendMessage(UUID sender, BaseComponent... components) {
                sendMessage(components);
            }

            public void sendMessage(UUID sender, @NotNull BaseComponent component) {
                sendMessage(component);
            }
        }
    }
}
