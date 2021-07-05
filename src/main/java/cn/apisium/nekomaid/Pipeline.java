package cn.apisium.nekomaid;

import com.corundumstudio.socketio.SocketIOChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.handler.codec.http.cors.CorsConfigBuilder;
import io.netty.handler.codec.http.cors.CorsHandler;
import io.netty.handler.stream.ChunkedWriteHandler;

public class Pipeline extends SocketIOChannelInitializer {
    public final static String CHUNKED_HANDLER = "chunked";
    public final static String CORS_HANDLER = "cors";
    @Override
    protected void addSocketioHandlers(ChannelPipeline pipeline) {
        super.addSocketioHandlers(pipeline);
        CorsConfigBuilder cors = "true".equals(System.getenv("DEBUG"))
                ? CorsConfigBuilder.forOrigins("http://maid.neko-craft.com", "http://127.0.0.1:1234")
                : CorsConfigBuilder.forOrigin("http://maid.neko-craft.com");
        pipeline
                .addBefore(SocketIOChannelInitializer.PACKET_HANDLER, CHUNKED_HANDLER, new ChunkedWriteHandler())
                .addBefore(CHUNKED_HANDLER, CORS_HANDLER, new CorsHandler(cors.allowCredentials().build()));
    }
}
