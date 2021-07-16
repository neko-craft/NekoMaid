package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.LRUCache;
import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.uniporter.Constants;
import cn.apisium.uniporter.Uniporter;
import cn.apisium.uniporter.router.api.Route;
import cn.apisium.uniporter.router.api.UniporterHttpHandler;
import io.netty.channel.*;
import io.netty.handler.codec.http.*;
import io.netty.handler.codec.http.multipart.DefaultHttpDataFactory;
import io.netty.handler.codec.http.multipart.FileUpload;
import io.netty.handler.codec.http.multipart.HttpPostRequestDecoder;
import io.netty.handler.codec.http.multipart.InterfaceHttpData;
import io.netty.handler.ssl.SslHandler;
import io.netty.handler.stream.ChunkedFile;

import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.UUID;

final class FilesManager {
    private static final DefaultHttpDataFactory factory = new DefaultHttpDataFactory(true);
    private final static int UPLOAD_STARTS = "/NekoMaidUpload/".length();
    private final static int DOWNLOAD_STARTS = "/NekoMaidDownload/".length();
    private final static long MAX_SIZE = 4 * 1024 * 1024; // 4MB
    private final static Path root = Paths.get(".");
    private final LRUCache<String, Path> uploadMap = new LRUCache<>(5);
    private final LRUCache<String, Path> downloadMap = new LRUCache<>(5);

    public FilesManager(NekoMaid main) {
        Uniporter.registerHandler("NekoMaidUpload", new UploadHandler(), true);
        Uniporter.registerHandler("NekoMaidDownload", new DownloadHandler(), true);
        main.onConnected(main, client -> client.onWithAck("files:fetch", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root) || !Files.isDirectory(p) || Files.isHidden(p)) return null;
                ArrayList<String> dirs = new ArrayList<>(), files = new ArrayList<>();
                Files.list(p).forEach(it -> (Files.isDirectory(it) ? dirs : files).add(it.getFileName().toString()));
                return new ArrayList[] { dirs, files };
            } catch (IOException e) {
                return null;
            }
        }).onWithAck("files:content", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root)) return 0;
                if (!Files.exists(p)) return 1;
                if (Files.isDirectory(p)) return 2;
                if (Files.isHidden(p) || !Files.isReadable(p) || !Files.isRegularFile(p)) return 0;
                if (Files.size(p) > MAX_SIZE) return 3;
                return new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            } catch (IOException e) {
                return null;
            }
        }).onWithAck("files:update", args -> {
            try {
                if (args.length != 2 && args.length != 3) return null;
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root)) return false;
                if (args.length == 2) {
                    if (Files.isHidden(p)) return false;
                    if (!Files.exists(p)) return true;
                    Files.walkFileTree(p, new SimpleFileVisitor<Path>() {
                        @Override
                        public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                            Files.delete(file);
                            return FileVisitResult.CONTINUE;
                        }
                        @Override
                        public FileVisitResult postVisitDirectory(Path dir, IOException e) throws IOException {
                            if (e == null) {
                                Files.delete(dir);
                                return FileVisitResult.CONTINUE;
                            } else throw e;
                        }
                    });
                } else if (args[1] != null && !Files.isDirectory(p)) {
                    Files.write(p, ((String) args[1]).getBytes(StandardCharsets.UTF_8));
                } else return false;
                return true;
            } catch (IOException ignored) { return false; }
        }).onWithAck("files:createDirectory", args -> {
            Path p = Paths.get(".", (String) args[0]);
            if (!p.startsWith(root) || Files.exists(p)) return false;
            try {
                Files.createDirectory(p);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }).onWithAck("files:rename", args -> {
            if (args.length != 3) return false;
            Path p0 = Paths.get(".", (String) args[0]), p1 = Paths.get(".", (String) args[1]);
            if (!p0.startsWith(root) || !Files.exists(p0)) return false;
            try {
                if (Files.isSameFile(p0, p1) || Files.isSameFile(root, p1) || Files.isSameFile(root, p0)) return false;
                Files.move(p0, p1);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }).onWithAck("files:download", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (p.startsWith(root) && Files.isRegularFile(p)) {
                    String id = UUID.randomUUID().toString();
                    downloadMap.put(id, p);
                    return id;
                }
                return true;
            } catch (Exception ignored) { }
            return false;
        }).onWithAck("files:upload", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (p.startsWith(root) && !Files.exists(p)) {
                    String id = UUID.randomUUID().toString();
                    uploadMap.put(id, p);
                    return id;
                }
            } catch (Exception ignored) { }
            return null;
        }));
    }

    public void disable() {
        Uniporter.removeHandler("NekoMaidUpload");
        Uniporter.removeHandler("NekoMaidDownload");
    }

    private final static class UploadDataHandler extends SimpleChannelInboundHandler<HttpContent> {
        private final HttpRequest request;
        private final HttpPostRequestDecoder httpDecoder;
        private final File file;
        public UploadDataHandler(HttpRequest request, File file) {
            this.request = request;
            httpDecoder = new HttpPostRequestDecoder(factory, request);
            httpDecoder.setDiscardThreshold(0);
            this.file = file;
        }
        @Override
        protected void channelRead0(ChannelHandlerContext ctx, HttpContent msg) throws Exception {
            httpDecoder.offer(msg);
            if (httpDecoder.hasNext()) {
                InterfaceHttpData data = httpDecoder.next();
                if (data != null) {
                    try {
                        if (data.getHttpDataType() == InterfaceHttpData.HttpDataType.FileUpload) {
                            final FileUpload fileUpload = (FileUpload) data;
                            try (FileChannel inputChannel = new FileInputStream(fileUpload.getFile()).getChannel();
                                 FileChannel outputChannel = new FileOutputStream(file).getChannel()) {
                                outputChannel.transferFrom(inputChannel, 0, inputChannel.size());
                                HttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.OK);
                                addHeaders(request, response);
                                ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
                            }
                        }
                    } finally {
                        data.release();
                    }
                }
            }
        }
    }

    private final class UploadHandler implements UniporterHttpHandler {
        @Override
        public void hijack(ChannelHandlerContext context, HttpRequest request) {
            context.pipeline().remove(Constants.PRE_ROUTE_ID);
            if (HttpMethod.PUT == request.method() && request.uri().length() > UPLOAD_STARTS) {
                Path p = uploadMap.remove(request.uri().substring(UPLOAD_STARTS));
                if (p != null) context.pipeline().replace(Constants.AGGREGATOR_HANDLER_ID, "UploadDataHandler",
                        new UploadDataHandler(request, p.toFile()));
            }
        }

        @Override
        public void handle(String path, Route route, ChannelHandlerContext context, FullHttpRequest request) {
            HttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1,
                    request.method() == HttpMethod.OPTIONS ? HttpResponseStatus.OK : HttpResponseStatus.FORBIDDEN);
            addHeaders(request, response);
            context.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
        }

        @Override
        public boolean hijackAggregator() { return true; }
    }

    private final class DownloadHandler implements UniporterHttpHandler {
        @Override
        public void handle(String path, Route route, ChannelHandlerContext context, FullHttpRequest request) {
            if (request.method() == HttpMethod.GET && path.length() > DOWNLOAD_STARTS) {
                Path file = downloadMap.get(path.substring(DOWNLOAD_STARTS));
                if (file != null) {
                    try {
                        if (context.pipeline().get(HttpContentCompressor.class) != null)
                            context.pipeline().remove(HttpContentCompressor.class);
                        RandomAccessFile raf = new RandomAccessFile(file.toFile().getAbsolutePath(), "r");
                        HttpResponse response = new DefaultHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.OK);
                        long length = raf.length();
                        HttpUtil.setContentLength(response, length);
                        response.headers().set(HttpHeaderNames.CONTENT_TYPE, HttpHeaderValues.APPLICATION_OCTET_STREAM)
                                .set(HttpHeaderNames.CONTENT_DISPOSITION, "attachment; filename=" + file.getFileName().toString());
                        context.write(response);
                        context.write(context.pipeline().get(SslHandler.class) == null
                                ? new DefaultFileRegion(raf.getChannel(), 0, length)
                                : new ChunkedFile(raf), context.newProgressivePromise());
                        context.writeAndFlush(LastHttpContent.EMPTY_LAST_CONTENT).addListener(ChannelFutureListener.CLOSE);
                        return;
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
            context.writeAndFlush(new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.FORBIDDEN))
                    .addListener(ChannelFutureListener.CLOSE);
        }
    }

    private static void addHeaders(HttpRequest request, HttpResponse response) {
        final String origin = request.headers().get(HttpHeaderNames.ORIGIN);
        if (origin != null) response.headers().set("Access-Control-Allow-Origin", origin)
                .set("Access-Control-Allow-Credentials", "true")
                .set("Access-Control-Allow-Methods", "POST,PUT")
                .set("Access-Control-Allow-Headers", "origin, content-type, accept");
    }
}
