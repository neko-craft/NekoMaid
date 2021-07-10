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
                        .on("console:run", args -> {
                            String command = (String) args[0];
                            main.getServer().getScheduler()
                                    .runTask(main, () -> {
                                        main.getLogger().info("NekoMaid issued server command: /" + command);
                                        try {
                                            main.getServer().dispatchCommand(main.getServer().getConsoleSender(), command);
                                        } catch (Exception e) {
                                            e.printStackTrace();
                                        }
                                    });
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
        main.broadcast(main, "console:log", "console", obj);
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
