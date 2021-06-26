package cn.apisium.nekomaid;

import com.corundumstudio.socketio.AckRequest;

@FunctionalInterface
public interface DataListener<T> {
    void onData(Client client, T data, AckRequest ackSender) throws Exception;
}
