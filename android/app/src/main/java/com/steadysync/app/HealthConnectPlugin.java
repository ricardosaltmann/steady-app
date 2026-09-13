package com.steadysync.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "HealthConnect",
    permissions = {
        @Permission(
            alias = "weight",
            strings = { "android.permission.health.READ_WEIGHT" }
        ),
        @Permission(
            alias = "bodyFat",
            strings = { "android.permission.health.READ_BODY_FAT" }
        ),
        @Permission(
            alias = "height",
            strings = { "android.permission.health.READ_HEIGHT" }
        )
    }
)
public class HealthConnectPlugin extends Plugin {

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void openHealthConnectSettings(PluginCall call) {
        try {
            Intent intent = new Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS");
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            try {
                Intent intent = new Intent("android.settings.HEALTH_CONNECT_SETTINGS");
                getActivity().startActivity(intent);
                call.resolve();
            } catch (Exception ex) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse("market://details?id=com.google.android.apps.healthdata"));
                    getActivity().startActivity(intent);
                    call.resolve();
                } catch (Exception ex2) {
                    call.reject("Health Connect não disponível", ex2);
                }
            }
        }
    }
}