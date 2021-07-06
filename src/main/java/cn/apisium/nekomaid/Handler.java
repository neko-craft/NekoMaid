package cn.apisium.nekomaid;

import cn.apisium.uniporter.router.api.Route;
import cn.apisium.uniporter.router.api.UniporterHttpHandler;
import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.DisconnectableHub;
import com.corundumstudio.socketio.SocketIOChannelInitializer;
import com.corundumstudio.socketio.ack.AckManager;
import com.corundumstudio.socketio.handler.*;
import com.corundumstudio.socketio.namespace.NamespacesHub;
import com.corundumstudio.socketio.protocol.*;
import com.corundumstudio.socketio.scheduler.CancelableScheduler;
import com.corundumstudio.socketio.scheduler.HashedWheelTimeoutScheduler;
import com.corundumstudio.socketio.store.StoreFactory;
import com.corundumstudio.socketio.store.pubsub.DisconnectMessage;
import com.corundumstudio.socketio.store.pubsub.PubSubType;
import com.corundumstudio.socketio.transport.PollingTransport;
import com.corundumstudio.socketio.transport.WebSocketTransport;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.http.FullHttpRequest;
import io.netty.handler.codec.http.websocketx.extensions.compression.WebSocketClientCompressionHandler;

public final class Handler implements UniporterHttpHandler, DisconnectableHub {
    private final AckManager ackManager;

    private final AuthorizeHandler authorizeHandler;
    private final PollingTransport xhrPollingTransport;
    private final WebSocketTransport webSocketTransport;
    private final EncoderHandler encoderHandler;
    private final WrongUrlHandler wrongUrlHandler;

    private final InPacketHandler packetHandler;

    private final Configuration configuration;
    private final CancelableScheduler scheduler = new HashedWheelTimeoutScheduler();

    public Handler(Configuration configuration, NamespacesHub namespacesHub) {
        this.configuration = configuration;

        ackManager = new AckManager(scheduler);

        JsonSupport jsonSupport = configuration.getJsonSupport();
        PacketEncoder encoder = new PacketEncoder(configuration, jsonSupport);
        PacketDecoder decoder = new PacketDecoder(jsonSupport, ackManager);

        String connectPath = configuration.getContext() + "/";

        StoreFactory factory = configuration.getStoreFactory();
        ClientsBox clientsBox = new ClientsBox();
        authorizeHandler = new AuthorizeHandler(connectPath, scheduler, configuration, namespacesHub, factory, this, ackManager, clientsBox);
        factory.init(namespacesHub, authorizeHandler, jsonSupport);
        xhrPollingTransport = new PollingTransport(decoder, authorizeHandler, clientsBox);
        webSocketTransport = new WebSocketTransport(false, authorizeHandler, configuration, scheduler, clientsBox);

        PacketListener packetListener = new PacketListener(ackManager, namespacesHub, xhrPollingTransport, scheduler);

        packetHandler = new InPacketHandler(packetListener, decoder, namespacesHub, configuration.getExceptionListener());

        try {
            encoderHandler = new EncoderHandler(configuration, encoder);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }

        wrongUrlHandler = new WrongUrlHandler();
    }

    @Override
    public void handle(String path, Route route, ChannelHandlerContext context, FullHttpRequest request) {
        context.pipeline()
                .addLast(SocketIOChannelInitializer.PACKET_HANDLER, packetHandler)
                .addLast(SocketIOChannelInitializer.AUTHORIZE_HANDLER, authorizeHandler)
                .addLast(SocketIOChannelInitializer.XHR_POLLING_TRANSPORT, xhrPollingTransport)
                .addLast(SocketIOChannelInitializer.WEB_SOCKET_TRANSPORT_COMPRESSION, WebSocketClientCompressionHandler.INSTANCE)
                .addLast(SocketIOChannelInitializer.WEB_SOCKET_TRANSPORT, webSocketTransport)
                .addLast(SocketIOChannelInitializer.SOCKETIO_ENCODER, encoderHandler)
                .addLast(SocketIOChannelInitializer.WRONG_URL_HANDLER, wrongUrlHandler);
    }

    @Override
    public void onDisconnect(ClientHead client) {
        ackManager.onDisconnect(client);
        authorizeHandler.onDisconnect(client);
        configuration.getStoreFactory().onDisconnect(client);
        configuration.getStoreFactory().pubSubStore().publish(PubSubType.DISCONNECT, new DisconnectMessage(client.getSessionId()));
    }

    public void stop() {
        StoreFactory factory = configuration.getStoreFactory();
        factory.shutdown();
        scheduler.shutdown();
    }
}
