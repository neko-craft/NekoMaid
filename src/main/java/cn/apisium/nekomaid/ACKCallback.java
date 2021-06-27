package cn.apisium.nekomaid;

import com.corundumstudio.socketio.AckCallback;

import java.util.function.Consumer;

@SuppressWarnings("unused")
public class ACKCallback <T> extends AckCallback<T> {
    private final Consumer<T> consumer;
    private Runnable timeout;

    public ACKCallback(Class<T> resultClass, Consumer<T> consumer) {
        super(resultClass);
        this.consumer = consumer;
    }
    public ACKCallback(Class<T> resultClass, int time, Consumer<T> consumer, Runnable timeout) {
        super(resultClass, time);
        this.consumer = consumer;
        this.timeout = timeout;
    }

    @Override
    public void onSuccess(T result) { consumer.accept(result); }

    @Override
    public void onTimeout() { if (timeout != null) timeout.run(); }
}
