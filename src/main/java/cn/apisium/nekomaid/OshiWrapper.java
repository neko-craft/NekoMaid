package cn.apisium.nekomaid;

import oshi.SystemInfo;
import oshi.hardware.ComputerSystem;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.software.os.OperatingSystem;

import java.lang.management.ManagementFactory;
import java.util.Properties;

public final class OshiWrapper {
    private final static class Info {
        public String javaVersion, virtualMachine, operatingSystem, manufacturer, model, cpu, pid, threads, javaCount;
    }
    public static Info getData() {
        Properties props = System.getProperties();
        Info info = new Info();
        info.javaVersion = props.getProperty("java.version") + " (build " + props.getProperty("java.vm.version") + ")";
        info.virtualMachine = props.getProperty("java.vm.name");
        info.pid = ManagementFactory.getRuntimeMXBean().getName().split("@", 2)[0];
        info.threads = Integer.toString(Thread.activeCount());

        SystemInfo si = new SystemInfo();
        HardwareAbstractionLayer hal = si.getHardware();
        ComputerSystem cs = hal.getComputerSystem();
        OperatingSystem os = si.getOperatingSystem();

        info.operatingSystem = os.toString();
        info.manufacturer = cs.getManufacturer();
        info.model = cs.getModel();
        info.cpu = hal.getProcessor().toString();

        info.javaCount = Integer.toString(os.getProcesses(a -> a.getName().startsWith("java"),
                OperatingSystem.ProcessSorting.NO_SORTING, 0).size());

        return info;
    }
}
