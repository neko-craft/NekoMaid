package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Utils;
import com.google.common.collect.EvictingQueue;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.*;
import org.apache.logging.log4j.core.appender.DefaultErrorHandler;
import org.apache.logging.log4j.core.layout.AbstractStringLayout;
import org.apache.logging.log4j.core.layout.PatternLayout;

import java.io.Serializable;
import java.util.concurrent.FutureTask;

@SuppressWarnings("UnstableApiUsage")
final class Console implements Appender {
    private ErrorHandler handler = new DefaultErrorHandler(this);
    private final NekoMaid main;
    private final EvictingQueue<Log> queue = EvictingQueue.create(100);
    private final AbstractStringLayout.Serializer serializer = PatternLayout.newSerializerBuilder()
            .setPattern("%msg%xEx{full}").setDisableAnsi(true).build();

    public Console(NekoMaid main) {
        this.main = main;
        main.onSwitchPage(main, "console", client -> client.emit("console:logs", queue))
                .onConnected(main, client -> client.onWithAck("console:complete", Utils::complete)
                        .onWithAck("console:run", args -> {
                            String command = (String) args[0];
                            FutureTask<Boolean> future = new FutureTask<>(() -> {
                                main.getLogger().info("NekoMaid issued server command: /" + command);
                                try {
                                    return main.getServer()
                                            .dispatchCommand(main.getServer().getConsoleSender(), command);
                                } catch (Exception e) {
                                    e.printStackTrace();
                                    return false;
                                }
                            });
                            main.getServer().getScheduler().runTask(main, future);
                            try {
                                return future.get();
                            } catch (Exception ignored) {
                                return false;
                            }
                        }));
        ((Logger) LogManager.getRootLogger()).addAppender(this);
    }

    @Override
    public void append(LogEvent e) {
        Log obj = new Log();
        obj.msg = serializer.toSerializable(e);
        obj.level = e.getLevel().name();
        obj.logger = e.getLoggerName();
        obj.time = e.getTimeMillis();
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
    }
}
