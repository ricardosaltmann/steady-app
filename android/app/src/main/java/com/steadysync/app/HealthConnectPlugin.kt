package com.steadysync.app

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.BloodGlucoseRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
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
import java.time.Duration
import java.time.Instant

@CapacitorPlugin(
    name = "HealthConnect",
    permissions = [
        Permission(alias = "weight", strings = ["android.permission.health.READ_WEIGHT"]),
        Permission(alias = "bodyFat", strings = ["android.permission.health.READ_BODY_FAT"]),
        Permission(alias = "height", strings = ["android.permission.health.READ_HEIGHT"]),
        Permission(alias = "glucose", strings = ["android.permission.health.READ_BLOOD_GLUCOSE"]),
        Permission(alias = "steps", strings = ["android.permission.health.READ_STEPS"]),
        Permission(alias = "sleep", strings = ["android.permission.health.READ_SLEEP"]),
        Permission(alias = "heartRate", strings = ["android.permission.health.READ_HEART_RATE"]),
        Permission(alias = "hydration", strings = ["android.permission.health.READ_HYDRATION"]),
        Permission(alias = "history", strings = ["android.permission.health.READ_HEALTH_DATA_HISTORY"])
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

            Log.i(TAG, "readRecords: tipo $type buscando de $startTime até $endTime")

            val ret = JSObject()
            val recordsArray = JSArray()

            runBlocking {
                when {
                    type.equals("All", ignoreCase = true) -> {
                        fetchAllMetrics(client, startTime, endTime, ret)
                        return@runBlocking
                    }
                    type.equals("BodyFat", ignoreCase = true) -> {
                        try {
                            val req = ReadRecordsRequest(
                                recordType = BodyFatRecord::class,
                                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                            )
                            val res = client.readRecords(req)
                            for (rec in res.records) {
                                val item = JSObject()
                                item.put("time", rec.time.toString())
                                item.put("percentage", rec.percentage.value)
                                item.put("value", rec.percentage.value)
                                item.put("bodyFatPercent", rec.percentage.value)
                                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                                item.put("recordId", rec.metadata.id)
                                recordsArray.put(item)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Falha ao ler BodyFat: ${e.message}")
                        }
                    }
                    type.equals("Steps", ignoreCase = true) -> {
                        try {
                            val req = ReadRecordsRequest(
                                recordType = StepsRecord::class,
                                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                            )
                            val res = client.readRecords(req)
                            for (rec in res.records) {
                                val item = JSObject()
                                item.put("startTime", rec.startTime.toString())
                                item.put("endTime", rec.endTime.toString())
                                item.put("count", rec.count)
                                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                                item.put("recordId", rec.metadata.id)
                                recordsArray.put(item)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Falha ao ler Steps: ${e.message}")
                        }
                    }
                    type.equals("Sleep", ignoreCase = true) || type.equals("SleepSession", ignoreCase = true) -> {
                        try {
                            val req = ReadRecordsRequest(
                                recordType = SleepSessionRecord::class,
                                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                            )
                            val res = client.readRecords(req)
                            for (rec in res.records) {
                                val item = JSObject()
                                item.put("startTime", rec.startTime.toString())
                                item.put("endTime", rec.endTime.toString())
                                val hours = Duration.between(rec.startTime, rec.endTime).toMinutes() / 60.0
                                item.put("hours", hours)
                                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                                item.put("recordId", rec.metadata.id)
                                recordsArray.put(item)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Falha ao ler SleepSession: ${e.message}")
                        }
                    }
                    type.equals("HeartRate", ignoreCase = true) -> {
                        try {
                            val req = ReadRecordsRequest(
                                recordType = HeartRateRecord::class,
                                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                            )
                            val res = client.readRecords(req)
                            for (rec in res.records) {
                                val item = JSObject()
                                item.put("startTime", rec.startTime.toString())
                                item.put("endTime", rec.endTime.toString())
                                val avgBpm = if (rec.samples.isNotEmpty()) {
                                    rec.samples.map { it.beatsPerMinute }.average()
                                } else 0.0
                                item.put("bpm", avgBpm)
                                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                                item.put("recordId", rec.metadata.id)
                                recordsArray.put(item)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Falha ao ler HeartRate: ${e.message}")
                        }
                    }
                    type.equals("Hydration", ignoreCase = true) -> {
                        try {
                            val req = ReadRecordsRequest(
                                recordType = HydrationRecord::class,
                                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                            )
                            val res = client.readRecords(req)
                            for (rec in res.records) {
                                val item = JSObject()
                                item.put("startTime", rec.startTime.toString())
                                item.put("endTime", rec.endTime.toString())
                                item.put("volumeLiters", rec.volume.inLiters)
                                item.put("volumeMl", rec.volume.inMilliliters)
                                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                                item.put("recordId", rec.metadata.id)
                                recordsArray.put(item)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Falha ao ler Hydration: ${e.message}")
                        }
                    }
                    else -> {
                        // Padrão: Ler registros de peso (WeightRecord)
                        try {
                            val req = ReadRecordsRequest(
                                recordType = WeightRecord::class,
                                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                            )
                            val res = client.readRecords(req)
                            for (rec in res.records) {
                                val item = JSObject()
                                item.put("time", rec.time.toString())
                                item.put("weightKg", rec.weight.inKilograms)
                                val weightObj = JSObject()
                                weightObj.put("inKilograms", rec.weight.inKilograms)
                                item.put("weight", weightObj)
                                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                                item.put("recordId", rec.metadata.id)
                                recordsArray.put(item)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Falha ao ler Weight: ${e.message}")
                        }
                    }
                }
            }

            if (!ret.has("records")) {
                ret.put("records", recordsArray)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "readRecords error: ", e)
            call.reject("Erro ao ler registros: " + e.message, e)
        }
    }

    @PluginMethod
    fun readAllHealthMetrics(call: PluginCall) {
        try {
            val client = HealthConnectClient.getOrCreate(context)
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

            Log.i(TAG, "readAllHealthMetrics: buscando métricas de $startTime até $endTime")

            val ret = JSObject()
            runBlocking {
                fetchAllMetrics(client, startTime, endTime, ret)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "readAllHealthMetrics error: ", e)
            call.reject("Erro ao ler todas as métricas: " + e.message, e)
        }
    }

    private suspend fun fetchAllMetrics(
        client: HealthConnectClient,
        startTime: Instant,
        endTime: Instant,
        ret: JSObject
    ) {
        val weightsArray = JSArray()
        val bodyFatArray = JSArray()
        val stepsArray = JSArray()
        val sleepArray = JSArray()
        val heartRateArray = JSArray()
        val hydrationArray = JSArray()

        // 1. WeightRecord
        try {
            val wReq = ReadRecordsRequest(
                recordType = WeightRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
            val wRes = client.readRecords(wReq)
            for (rec in wRes.records) {
                val item = JSObject()
                item.put("time", rec.time.toString())
                item.put("weightKg", rec.weight.inKilograms)
                val wObj = JSObject()
                wObj.put("inKilograms", rec.weight.inKilograms)
                item.put("weight", wObj)
                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                item.put("recordId", rec.metadata.id)
                weightsArray.put(item)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Não foi possível ler WeightRecord: ${e.message}")
        }

        // 2. BodyFatRecord
        try {
            val bfReq = ReadRecordsRequest(
                recordType = BodyFatRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
            val bfRes = client.readRecords(bfReq)
            for (rec in bfRes.records) {
                val item = JSObject()
                item.put("time", rec.time.toString())
                item.put("percentage", rec.percentage.value)
                item.put("value", rec.percentage.value)
                item.put("bodyFatPercent", rec.percentage.value)
                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                item.put("recordId", rec.metadata.id)
                bodyFatArray.put(item)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Não foi possível ler BodyFatRecord: ${e.message}")
        }

        // 3. StepsRecord
        try {
            val stepsReq = ReadRecordsRequest(
                recordType = StepsRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
            val stepsRes = client.readRecords(stepsReq)
            for (rec in stepsRes.records) {
                val item = JSObject()
                item.put("startTime", rec.startTime.toString())
                item.put("endTime", rec.endTime.toString())
                item.put("count", rec.count)
                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                item.put("recordId", rec.metadata.id)
                stepsArray.put(item)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Não foi possível ler StepsRecord: ${e.message}")
        }

        // 4. SleepSessionRecord
        try {
            val sleepReq = ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
            val sleepRes = client.readRecords(sleepReq)
            for (rec in sleepRes.records) {
                val item = JSObject()
                item.put("startTime", rec.startTime.toString())
                item.put("endTime", rec.endTime.toString())
                val hours = Duration.between(rec.startTime, rec.endTime).toMinutes() / 60.0
                item.put("hours", hours)
                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                item.put("recordId", rec.metadata.id)
                sleepArray.put(item)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Não foi possível ler SleepSessionRecord: ${e.message}")
        }

        // 5. HeartRateRecord
        try {
            val hrReq = ReadRecordsRequest(
                recordType = HeartRateRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
            val hrRes = client.readRecords(hrReq)
            for (rec in hrRes.records) {
                val item = JSObject()
                item.put("startTime", rec.startTime.toString())
                item.put("endTime", rec.endTime.toString())
                val avgBpm = if (rec.samples.isNotEmpty()) {
                    rec.samples.map { it.beatsPerMinute }.average()
                } else 0.0
                item.put("bpm", avgBpm)
                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                item.put("recordId", rec.metadata.id)
                heartRateArray.put(item)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Não foi possível ler HeartRateRecord: ${e.message}")
        }

        // 6. HydrationRecord
        try {
            val hydReq = ReadRecordsRequest(
                recordType = HydrationRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
            val hydRes = client.readRecords(hydReq)
            for (rec in hydRes.records) {
                val item = JSObject()
                item.put("startTime", rec.startTime.toString())
                item.put("endTime", rec.endTime.toString())
                item.put("volumeLiters", rec.volume.inLiters)
                item.put("volumeMl", rec.volume.inMilliliters)
                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                item.put("recordId", rec.metadata.id)
                hydrationArray.put(item)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Não foi possível ler HydrationRecord: ${e.message}")
        }

        // 7. BloodGlucoseRecord
        val glucoseArray = JSArray()
        try {
            val bgReq = ReadRecordsRequest(
                recordType = BloodGlucoseRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
            val bgRes = client.readRecords(bgReq)
            for (rec in bgRes.records) {
                val item = JSObject()
                item.put("time", rec.time.toString())
                item.put("glucoseMgDl", rec.level.inMilligramsPerDeciliter)
                item.put("value", rec.level.inMilligramsPerDeciliter)
                item.put("dataOrigin", rec.metadata.dataOrigin.packageName)
                item.put("recordId", rec.metadata.id)
                glucoseArray.put(item)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Não foi possível ler BloodGlucoseRecord: ${e.message}")
        }

        ret.put("weights", weightsArray)
        ret.put("records", weightsArray) // Retrocompatibilidade direta
        ret.put("bodyFat", bodyFatArray)
        ret.put("glucose", glucoseArray)
        ret.put("steps", stepsArray)
        ret.put("sleep", sleepArray)
        ret.put("heartRates", heartRateArray)
        ret.put("hydration", hydrationArray)
    }
}