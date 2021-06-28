package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Room;
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
    private final EvictingQueue<Log> queue = EvictingQueue.create(100);
    private final Room room;
    private final AbstractStringLayout.Serializer serializer = PatternLayout.newSerializerBuilder()
            .setPattern("%msg%xEx{full}").setDisableAnsi(true).build();

    public Console(NekoMaid main) {
        room = main.onSwitchPage(main, "console", client -> client.emit("console:logs", queue));
        main
                .onWithAck(main, "console:complete", String.class, Utils::complete)
                .on(main, "console:run", String.class, (c, it) -> main.getServer().getScheduler()
                        .runTask(main, () -> {
                            main.getLogger().info(c.getAddress() + " issued server command: /" + it);
                            try {
                                main.getServer().dispatchCommand(main.getServer().getConsoleSender(), it);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }));
        ((Logger) LogManager.getRootLogger()).addAppender(this);
    }

    @Override
    public void append(LogEvent e) {
        var obj = new Log(serializer.toSerializable(e), e.getLevel().name(), e.getLoggerName(), e.getTimeMillis());
        queue.add(obj);
        room.emit("console:log", obj);
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

    private static final record Log(String msg, String level, String logger, long time) { }
}
