package com.steadysync.app

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import kotlinx.coroutines.runBlocking
import java.time.Instant

@CapacitorPlugin(
    name = "HealthConnect",
    permissions = [
        Permission(alias = "weight", strings = ["android.permission.health.READ_WEIGHT"]),
        Permission(alias = "bodyFat", strings = ["android.permission.health.READ_BODY_FAT"]),
        Permission(alias = "height", strings = ["android.permission.health.READ_HEIGHT"])
    ]
)
class HealthConnectPlugin : Plugin() {

    private val TAG = "HealthConnectPlugin"

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val ret = JSObject()
        val status = HealthConnectClient.getSdkStatus(context)
        ret.put("available", status == HealthConnectClient.SDK_AVAILABLE)
        ret.put("status", status)
        call.resolve(ret)
    }

    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        try {
            val intent = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
            activity.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            try {
                val intent = Intent(Intent.ACTION_VIEW)
                intent.data = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                activity.startActivity(intent)
                call.resolve()
            } catch (ex: Exception) {
                call.reject("Health Connect não disponível", ex)
            }
        }
    }

    @PluginMethod
    fun readRecords(call: PluginCall) {
        try {
            val client = HealthConnectClient.getOrCreate(context)
            val type = call.getString("type", "Weight")
            val timeFilterObj = call.getObject("timeRangeFilter")
            val startTimeStr = timeFilterObj?.optString("startTime") ?: call.getString("startTime")
            val endTimeStr = timeFilterObj?.optString("endTime") ?: call.getString("endTime")

            val startTime = if (!startTimeStr.isNullOrEmpty()) {
                Instant.parse(startTimeStr)
            } else {
                Instant.now().minusSeconds(60L * 24 * 3600)
            }

            val endTime = if (!endTimeStr.isNullOrEmpty()) {
                Instant.parse(endTimeStr)
            } else {
                Instant.now()
            }

            Log.i(TAG, "readRecords: tipo  buscando de  até ")

            val recordsArray = JSArray()

            runBlocking {
                if (type.equals("BodyFat", ignoreCase = true)) {
                    val bfRequest = ReadRecordsRequest(
                        recordType = BodyFatRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                    )
                    val bfResponse = client.readRecords(bfRequest)
                    Log.i(TAG, "BodyFat records encontrados: ")
                    for (rec in bfResponse.records) {
                        val item = JSObject()
                        item.put("time", rec.time.toString())
                        item.put("percentage", rec.percentage.value)
                        recordsArray.put(item)
                    }
                } else {
                    // Padrão: Ler registros de peso (WeightRecord)
                    val weightRequest = ReadRecordsRequest(
                        recordType = WeightRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                    )
                    val weightResponse = client.readRecords(weightRequest)
                    Log.i(TAG, "Weight records encontrados: ")
                    for (rec in weightResponse.records) {
                        val item = JSObject()
                        item.put("time", rec.time.toString())
                        item.put("weightKg", rec.weight.inKilograms)
                        val weightObj = JSObject()
                        weightObj.put("inKilograms", rec.weight.inKilograms)
                        item.put("weight", weightObj)
                        recordsArray.put(item)
                    }
                }
            }

            val ret = JSObject()
            ret.put("records", recordsArray)
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "readRecords error: ", e)
            call.reject("Erro ao ler registros: " + e.message, e)
        }
    }
}