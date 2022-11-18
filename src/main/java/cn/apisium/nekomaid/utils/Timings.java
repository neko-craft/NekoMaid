package cn.apisium.nekomaid.utils;

import com.alibaba.fastjson2.JSONObject;
import org.jetbrains.annotations.Nullable;

public interface Timings {
    @Nullable
    Timings INSTANCE = Utils.initTimings();

    boolean isStarted();
    JSONObject exportData();
    void setEnable(boolean flag);
}
