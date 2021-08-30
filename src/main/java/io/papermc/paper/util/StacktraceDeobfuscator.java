package io.papermc.paper.util;

public enum StacktraceDeobfuscator {
    INSTANCE;
    public StackTraceElement[] deobfuscateStacktrace(StackTraceElement[] traceElements) {
        return traceElements;
    }
}
