package cn.apisium.nekomaid;

import cn.apisium.uniporter.router.api.Route;
import cn.apisium.uniporter.router.api.UniporterHttpHandler;
import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.DisconnectableHub;
import com.corundumstudio.socketio.SocketIOChannelInitializer;
import com.corundumstudio.socketio.ack.AckManager;
import com.corundumstudio.socketio.handler.*;
import com.corundumstudio.socketio.listener.ExceptionListener;
import com.corundumstudio.socketio.messages.PacketsMessage;
import com.corundumstudio.socketio.namespace.Namespace;
import com.corundumstudio.socketio.namespace.NamespacesHub;
import com.corundumstudio.socketio.protocol.*;
import com.corundumstudio.socketio.scheduler.CancelableScheduler;
import com.corundumstudio.socketio.scheduler.HashedWheelTimeoutScheduler;
import com.corundumstudio.socketio.store.StoreFactory;
import com.corundumstudio.socketio.store.pubsub.DisconnectMessage;
import com.corundumstudio.socketio.store.pubsub.PubSubType;
import com.corundumstudio.socketio.transport.NamespaceClient;
import com.corundumstudio.socketio.transport.PollingTransport;
import com.corundumstudio.socketio.transport.WebSocketTransport;
import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.FullHttpRequest;
import io.netty.handler.codec.http.websocketx.extensions.compression.WebSocketClientCompressionHandler;
import io.netty.util.CharsetUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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

    @ChannelHandler.Sharable
    static public class InPacketHandler extends SimpleChannelInboundHandler<PacketsMessage> {

        private static final Logger log = LoggerFactory.getLogger(com.corundumstudio.socketio.handler.InPacketHandler.class);

        private final PacketListener packetListener;
        private final PacketDecoder decoder;
        private final NamespacesHub namespacesHub;
        private final ExceptionListener exceptionListener;

        public InPacketHandler(PacketListener packetListener, PacketDecoder decoder, NamespacesHub namespacesHub, ExceptionListener exceptionListener) {
            super();
            this.packetListener = packetListener;
            this.decoder = decoder;
            this.namespacesHub = namespacesHub;
            this.exceptionListener = exceptionListener;
        }

        @Override
        protected void channelRead0(io.netty.channel.ChannelHandlerContext ctx, PacketsMessage message)
                throws Exception {
            ByteBuf content = message.getContent();
            ClientHead client = message.getClient();

            log.info("In message: {} sessionId: {}", content.toString(CharsetUtil.UTF_8), client.getSessionId());
            while (content.isReadable()) {
                try {
                    Packet packet = decoder.decodePackets(content, client);
                    if (packet.hasAttachments() && !packet.isAttachmentsLoaded()) {
                        return;
                    }
                    Namespace ns = namespacesHub.get(packet.getNsp());
                    if (ns == null) {
                        if (packet.getSubType() == PacketType.CONNECT) {
                            Packet p = new Packet(PacketType.MESSAGE);
                            p.setSubType(PacketType.ERROR);
                            p.setNsp(packet.getNsp());
                            p.setData("Invalid namespace");
                            client.send(p);
                            return;
                        }
                        log.info("Can't find namespace for endpoint: {}, sessionId: {} probably it was removed.", packet.getNsp(), client.getSessionId());
                        return;
                    }

                    if (packet.getSubType() == PacketType.CONNECT) {
                        client.addNamespaceClient(ns);
                    }

                    NamespaceClient nClient = client.getChildClient(ns);
                    if (nClient == null) {
                        log.info("Can't find namespace client in namespace: {}, sessionId: {} probably it was disconnected.", ns.getName(), client.getSessionId());
                        return;
                    }
                    packetListener.onPacket(packet, nClient, message.getTransport());
                } catch (Exception ex) {
                    String c = content.toString(CharsetUtil.UTF_8);
                    log.info("Error during data processing. Client sessionId: " + client.getSessionId() + ", data: " + c, ex);
                    throw ex;
                }
            }
        }

        @Override
        public void exceptionCaught(ChannelHandlerContext ctx, Throwable e) throws Exception {
            if (!exceptionListener.exceptionCaught(ctx, e)) {
                super.exceptionCaught(ctx, e);
            }
        }

    }
}
