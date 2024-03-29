package cn.apisium.nekomaid.builtin;

import cn.apisium.nekomaid.NekoMaid;
import cn.apisium.nekomaid.utils.Utils;
import cn.apisium.uniporter.Constants;
import cn.apisium.uniporter.Uniporter;
import cn.apisium.uniporter.router.api.Route;
import cn.apisium.uniporter.router.api.UniporterHttpHandler;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import io.netty.channel.*;
import io.netty.handler.codec.http.*;
import io.netty.handler.codec.http.multipart.DefaultHttpDataFactory;
import io.netty.handler.codec.http.multipart.FileUpload;
import io.netty.handler.codec.http.multipart.HttpPostRequestDecoder;
import io.netty.handler.codec.http.multipart.InterfaceHttpData;
import io.netty.handler.ssl.SslHandler;
import io.netty.handler.stream.ChunkedFile;
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.ArchiveStreamFactory;
import org.apache.commons.compress.archivers.ar.ArArchiveEntry;
import org.apache.commons.compress.archivers.cpio.CpioArchiveEntry;
import org.apache.commons.compress.archivers.jar.JarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.io.IOUtils;

import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

final class FilesManager {
    private static final ArchiveStreamFactory archiveFactory = new ArchiveStreamFactory();
    private static final DefaultHttpDataFactory factory = new DefaultHttpDataFactory();
    private final static long MAX_SIZE = 4 * 1024 * 1024; // 4MB
    private final static Path root = Paths.get(".");
    private final NekoMaid main;
    private final Cache<String, Path> uploadMap = createCache();
    private final Cache<String, Path> downloadMap = createCache();

    public FilesManager(NekoMaid main) {
        this.main = main;
        Uniporter.registerHandler("NekoMaidUpload", new UploadHandler(), true);
        Uniporter.registerHandler("NekoMaidDownload", new DownloadHandler(), true);
        main.onConnected(main, client -> client.onWithAck("files:fetch", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root) || !Files.isDirectory(p)) return null;
                ArrayList<String> dirs = new ArrayList<>(), files = new ArrayList<>();
                try (Stream<Path> stream = Files.list(p)) {
                    stream.forEach(it -> (Files.isDirectory(it) ? dirs : files).add(it.getFileName().toString()));
                }
                return new ArrayList[] { dirs, files };
            } catch (Throwable e) {
                e.printStackTrace();
                return null;
            }
        }).onWithAck("files:content", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root)) return 0;
                if (!Files.exists(p)) return 1;
                if (Files.isDirectory(p)) return 2;
                if (!Files.isReadable(p) || !Files.isRegularFile(p)) return 0;
                if (Files.size(p) > MAX_SIZE) return 3;
                return new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            } catch (Throwable e) {
                return null;
            }
        }).onWithAck("files:update", args -> {
            try {
                if (args.length != 2 && args.length != 3) return null;
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root)) return false;
                if (args.length == 2) return Utils.deletePath(p);
                else if (args[1] != null && !Files.isDirectory(p)) {
                    Files.write(p, ((String) args[1]).getBytes(StandardCharsets.UTF_8));
                } else return false;
                return true;
            } catch (Throwable ignored) { return false; }
        }).onWithAck("files:createDirectory", args -> {
            Path p = Paths.get(".", (String) args[0]);
            if (!p.startsWith(root) || Files.exists(p)) return false;
            try {
                Files.createDirectory(p);
                return true;
            } catch (Throwable ignored) {
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
            } catch (Throwable ignored) {
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
            } catch (Throwable ignored) { }
            return false;
        }).onWithAck("files:upload", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (p.startsWith(root) && !Files.exists(p)) {
                    String id = UUID.randomUUID().toString();
                    uploadMap.put(id, p);
                    return id;
                }
            } catch (Throwable ignored) { }
            return null;
        }).onWithAck("files:compress", args -> {
            try {
                Path p = Paths.get(".", (String) args[0]);
                if (!p.startsWith(root) || !Files.exists(p)) return false;
                if (args.length == 4) {
                    String ext = (String) args[2];
                    String file = args[1] + "." + ext;
                    Path parent = Files.isSameFile(root, p) ? root : p.getParent();
                    Path outFile = new File(parent.toFile(), file).toPath();
                    if (!outFile.startsWith(root) || Files.exists(outFile)) return false;
                    try (ArchiveOutputStream os = archiveFactory.createArchiveOutputStream((String) args[2],
                            Files.newOutputStream(outFile))) {
                        if (Files.isDirectory(p)) {
                            Files.walkFileTree(p, new SimpleFileVisitor<Path>() {
                                @Override
                                public FileVisitResult visitFile(Path f, BasicFileAttributes attrs) throws IOException {
                                    addEntry(ext, os, parent, f);
                                    return FileVisitResult.CONTINUE;
                                }
                            });
                        } else addEntry(ext, os, parent, p);
                        return true;
                    } catch (Throwable e) { e.printStackTrace(); }
                } else if (Files.isRegularFile(p)) {
                    try (ArchiveInputStream is = archiveFactory.createArchiveInputStream(
                            new BufferedInputStream(Files.newInputStream(p)))) {
                        ArchiveEntry archiveEntry;
                        while ((archiveEntry = is.getNextEntry()) != null) {
                            Path outputFile = new File(p.getParent().toFile(), archiveEntry.getName()).toPath();
                            if (!Files.exists(outputFile.getParent())) Files.createDirectories(outputFile.getParent());
                            try (OutputStream outputStream = Files.newOutputStream(outputFile)) {
                                IOUtils.copy(is, outputStream);
                            }
                        }
                        return true;
                    } catch (Throwable e) { e.printStackTrace(); }
                }
            } catch (Throwable ignored) { }
            return false;
        }).onWithAck("files:copy", (args) -> {
            try {
                Path p1 = Paths.get(".", (String) args[0]), p2 = Paths.get(".", (String) args[1]);
                if (p1.startsWith(root) && Files.exists(p1) && p1.startsWith(root) && Files.isDirectory(p2))
                    return Utils.copyPath(p1, p2);
            } catch (Throwable ignored) { }
            return false;
        }));
    }

    public void disable() {
        Uniporter.removeHandler("NekoMaidUpload");
        Uniporter.removeHandler("NekoMaidDownload");
    }

    private final class UploadDataHandler extends SimpleChannelInboundHandler<HttpContent> {
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
                            try (FileInputStream fis = new FileInputStream(fileUpload.getFile());
                                 FileOutputStream fos = new FileOutputStream(file)) {
                                FileChannel inputChannel = fis.getChannel(),
                                        outputChannel = fos.getChannel();
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

        @Override
        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
            if (main.isDebug()) cause.printStackTrace();
        }
    }

    private final class UploadHandler implements UniporterHttpHandler {
        @Override
        public void hijack(ChannelHandlerContext context, HttpRequest request) {
            if (HttpMethod.PUT != request.method()) return;
            String[] arr = request.uri().split("/");
            if (arr.length == 0) return;
            Path p = uploadMap.getIfPresent(arr[arr.length - 1]);
            if (p != null) context.pipeline().replace(Constants.AGGREGATOR_HANDLER_ID, "UploadDataHandler",
                    new UploadDataHandler(request, p.toFile()));
        }

        @Override
        public void handle(String path, Route route, ChannelHandlerContext context, FullHttpRequest request) {
            HttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1,
                    request.method() == HttpMethod.OPTIONS ? HttpResponseStatus.OK : HttpResponseStatus.METHOD_NOT_ALLOWED);
            addHeaders(request, response);
            context.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
        }

        @Override
        public boolean hijackAggregator() { return true; }
    }

    private final class DownloadHandler implements UniporterHttpHandler {
        @Override
        public void handle(String path, Route route, ChannelHandlerContext context, FullHttpRequest request) {
            if (request.method() == HttpMethod.GET) {
                String[] arr = request.uri().split("/");
                if (arr.length != 0) {
                    Path file = downloadMap.getIfPresent(arr[arr.length - 1]);
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
                        } catch (Throwable e) {
                            e.printStackTrace();
                        }
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

    private static void addEntry(String ext, ArchiveOutputStream os, Path parent, Path file) throws IOException,
            IllegalArgumentException {
        String path = parent.relativize(file).toString();
        ArchiveEntry archiveEntry;
        switch (ext) {
            case ArchiveStreamFactory.JAR:
                archiveEntry = new JarArchiveEntry(new ZipArchiveEntry(file, path));
                break;
            case ArchiveStreamFactory.ZIP:
                archiveEntry = new ZipArchiveEntry(file, path);
                break;
            case ArchiveStreamFactory.AR:
                archiveEntry = new ArArchiveEntry(file, path);
                break;
            case ArchiveStreamFactory.TAR:
                archiveEntry = new TarArchiveEntry(file, path);
                break;
            case ArchiveStreamFactory.CPIO:
                archiveEntry = new CpioArchiveEntry(file, path);
                break;
            default: throw new IllegalArgumentException("Unsupported archive format: " + ext);
        }

        os.putArchiveEntry(archiveEntry);
        try (InputStream is = Files.newInputStream(file)) { IOUtils.copy(is, os); }
        os.closeArchiveEntry();
    }

    private static Cache<String, Path> createCache() {
        return CacheBuilder.newBuilder().maximumSize(5).expireAfterWrite(15, TimeUnit.MINUTES).build();
    }
}
