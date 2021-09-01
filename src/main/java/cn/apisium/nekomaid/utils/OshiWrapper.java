package cn.apisium.nekomaid.utils;

import cn.apisium.nekomaid.builtin.Profiler;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.Filter;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.Logger;
import org.apache.logging.log4j.core.filter.AbstractFilter;
import oshi.SystemInfo;
import oshi.hardware.*;
import oshi.software.os.OperatingSystem;

import java.lang.management.ManagementFactory;
import java.util.Iterator;
import java.util.Properties;

public final class OshiWrapper {
    private final static SystemInfo si = new SystemInfo();
    private final static HardwareAbstractionLayer hal = si.getHardware();
    private final static ComputerSystem cs = hal.getComputerSystem();
    private final static OperatingSystem os = si.getOperatingSystem();
    private final static CentralProcessor cpu = si.getHardware().getProcessor();
    private final static Sensors sensors =  hal.getSensors();
    private static long reads, writes, recv, sent;
    private static long[] oldTicks = new long[CentralProcessor.TickType.values().length];
    private static long[][] oldProcTicks = new long[cpu.getLogicalProcessorCount()]
            [CentralProcessor.TickType.values().length];
    private static final Filter filter = new AbstractFilter() {
        @Override
        public Result filter(LogEvent event) {
            return event.getLoggerName().endsWith("WmiQueryHandler") ? Result.DENY : super.filter(event);
        }
    };

    private final static class Info {
        public boolean isAikarFlags;
        public String javaVersion, virtualMachine, operatingSystem, manufacturer, model, cpu, pid, javaCount, args;
    }

    static {
        ((Logger) LogManager.getRootLogger()).addFilter(filter);
    }

    public static Info getData() {
        Properties props = System.getProperties();
        Info info = new Info();
        String vmName = System.getProperty("java.vm.name");
        info.args = (vmName == null ? "" : vmName.contains("Server") ? "-server " : vmName.contains("Client") ? "-client " : "");
        info.args += String.join(" ", ManagementFactory.getRuntimeMXBean().getInputArguments());
        info.javaVersion = props.getProperty("java.version") + " (build " + props.getProperty("java.vm.version") + ")";
        info.virtualMachine = vmName;
        info.pid = ManagementFactory.getRuntimeMXBean().getName().split("@", 2)[0];
        info.isAikarFlags = "https://mcflags.emc.gs".equals(props.getProperty("using.aikars.flags")) &&
                        "true".equals(props.getProperty("aikars.new.flags"));

        info.operatingSystem = os.toString();
        info.manufacturer = cs.getManufacturer();
        info.model = cs.getModel();
        info.cpu = hal.getProcessor().toString();

        info.javaCount = Integer.toString(os.getProcesses(a -> a.getName().startsWith("java"),
                OperatingSystem.ProcessSorting.NO_SORTING, 0).size());

        return info;
    }

    public static void applyProfilerStatus(Profiler.Status status) {
        if (status.cpu == -1) {
            status.cpu = cpu.getSystemCpuLoadBetweenTicks(oldTicks);
            oldTicks = cpu.getSystemCpuLoadTicks();
        }

        status.processorLoad = cpu.getProcessorCpuLoadBetweenTicks(oldProcTicks);
        oldProcTicks = cpu.getProcessorCpuLoadTicks();
        status.temperature = sensors.getCpuTemperature();
        long curReads = 0, curWrites = 0, curRecv = 0, curSent = 0;
        for (HWDiskStore hwDiskStore : hal.getDiskStores()) {
            curReads += hwDiskStore.getReadBytes();
            curWrites += hwDiskStore.getWriteBytes();
        }
        for (NetworkIF it : hal.getNetworkIFs()) {
            curRecv += it.getBytesRecv();
            curSent += it.getBytesSent();
        }
        status.reads = curReads - reads;
        status.writes = curWrites - writes;
        status.recv = curRecv - recv;
        status.sent = curSent - sent;
        reads = curReads;
        writes = curWrites;
        recv = curRecv;
        sent = curSent;
    }

    public static void stop() {
        Iterator<Filter> it = ((Logger) LogManager.getRootLogger()).getFilters();
        while (it.hasNext()) if (it.next() == filter) it.remove();
    }
}
