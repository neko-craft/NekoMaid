package cn.apisium.nekomaid;

import com.corundumstudio.socketio.SocketIOChannelInitializer;
import io.netty.channel.ChannelPipeline;

public class Pipeline extends SocketIOChannelInitializer {
    public final static String STATIC_HANDLER = "staticHandler";
    @Override
    protected void addSocketioHandlers(ChannelPipeline pipeline) {
        super.addSocketioHandlers(pipeline);
        pipeline.addBefore(SocketIOChannelInitializer.PACKET_HANDLER, STATIC_HANDLER, new StaticHandler());
    }
}
