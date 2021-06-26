package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.Room;
import com.google.common.collect.EvictingQueue;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.*;
import org.apache.logging.log4j.core.appender.DefaultErrorHandler;
import org.apache.logging.log4j.core.layout.AbstractStringLayout;
import org.apache.logging.log4j.core.layout.PatternLayout;

import java.io.Serializable;

@SuppressWarnings("UnstableApiUsage")
public final class Console implements Appender {
    private ErrorHandler handler = new DefaultErrorHandler(this);
    private final EvictingQueue<Log> queue = EvictingQueue.create(100);
    private final Room room;
    private final AbstractStringLayout.Serializer serializer = PatternLayout.newSerializerBuilder()
            .setPattern("%msg%xEx{full}").setDisableAnsi(true).build();

    public Console(NekoMaid main) {
        room = main.onSwitchPage(main, "console", client -> client.emit("logs", queue));
        ((Logger) LogManager.getRootLogger()).addAppender(this);
    }

    @Override
    public void append(LogEvent event) {
        var obj = new Log();
        obj.level = event.getLevel().name();
        obj.time = event.getTimeMillis();
        obj.logger = event.getLoggerName();
        obj.msg = serializer.toSerializable(event);
        queue.add(obj);
        room.emit("log", obj);
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

    private static final class Log {
        public String msg, level, logger;
        public long time;
    }
}
