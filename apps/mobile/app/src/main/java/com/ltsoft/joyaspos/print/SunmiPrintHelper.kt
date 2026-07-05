package com.ltsoft.joyaspos.print

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.os.IBinder
import android.os.RemoteException
import android.util.Log
import com.ltsoft.joyaspos.R
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.delay
import woyou.aidlservice.jiuiv5.IWoyouService
import javax.inject.Inject
import javax.inject.Singleton

data class ReceiptData(
    val ventaId: String,
    val fecha: String,
    val cliente: String,
    val vendedor: String,
    val items: List<ReceiptItem>,
    val montoTotal: Double,
    val nombreNegocio: String = "JoyasPOS",
)

data class ReceiptItem(
    val detalle: String,
    val cantidad: Double,
    val precioUnitario: Double,
    val total: Double,
)

@Singleton
class SunmiPrintHelper @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val TAG = "SunmiPrinter"
        private const val LINE_WIDTH = 32
        private val CUT_PAPER = byteArrayOf(0x1D, 0x56, 0x00)
    }

    private var woyouService: IWoyouService? = null
    private var isConnected = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            Log.e(TAG, "onServiceConnected! Convirtiendo binder...")
            woyouService = IWoyouService.Stub.asInterface(service)
            isConnected = woyouService != null
            if (isConnected) Log.e(TAG, "Impresora conectada OK")
            else Log.e(TAG, "IWoyouService.Stub.asInterface() retornó null")
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            woyouService = null
            isConnected = false
            Log.w(TAG, "Impresora desconectada")
        }
    }

    init {
        bindPrinterService()
    }

    private fun bindPrinterService() {
        Log.e(TAG, "Iniciando conexión con servicio Sunmi...")
        try {
            val intent = Intent().apply {
                setPackage("woyou.aidlservice.jiuiv5")
                action = "woyou.aidlservice.jiuiv5.IWoyouService"
            }
            val bound = context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
            Log.e(TAG, "bindService() → $bound")
            if (!bound) Log.e(TAG, "Servicio no encontrado. ¿Es este un dispositivo Sunmi con el servicio instalado?")
        } catch (e: Exception) {
            Log.e(TAG, "Excepción al conectar con impresora: ${e.message}", e)
        }
    }

    fun unbindService() {
        try {
            context.unbindService(serviceConnection)
        } catch (e: Exception) {
            Log.e(TAG, "Error al desconectar: ${e.message}")
        }
    }

    suspend fun awaitConnected(timeoutMs: Long = 3_000): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (!isConnected) {
            if (System.currentTimeMillis() >= deadline) return false
            delay(100)
        }
        return true
    }

    fun printReceipt(
        data: ReceiptData,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {},
    ) {
        val service = woyouService
        if (!isConnected || service == null) {
            onError("Impresora no disponible. Verifica que el papel esté instalado.")
            return
        }
        try {
            service.apply {
                printerInit(null)

                setAlignment(1, null)
                // setFontSize(36f, null)
                // printText("${data.nombreNegocio}\n", null)
                val bitmap = BitmapFactory.decodeResource(context.resources, R.drawable.logo_to_print)
                printBitmap(bitmap, null)

                setFontSize(24f, null)
                printText("================================\n", null)

                setAlignment(1, null)
                setFontSize(28f, null)
                printText("${data.fecha}\n", null)
                setAlignment(0, null)
                setFontSize(26f, null)
                printText("Venta  : ${data.ventaId}\n", null)
                printText("Cliente: ${truncate(data.cliente, 20)}\n", null)
                printText("Vendor : ${truncate(data.vendedor, 20)}\n", null)
                setFontSize(24f, null)
                printText("--------------------------------\n", null)

                printText(formatTableHeader(), null)
                printText("--------------------------------\n", null)

                data.items.forEach { item ->
                    printText(formatItemLine(item), null)
                }

                printText("--------------------------------\n", null)
                setAlignment(1, null)
                setFontSize(36f, null)
                printText("TOTAL: \$${formatMonto(data.montoTotal)}\n", null)

                setAlignment(1, null)
                setFontSize(22f, null)
                printText("================================\n", null)
                printText("   Gracias por su compra\n", null)
                printText("================================\n", null)

                lineWrap(3, null)
                sendRAWData(CUT_PAPER, null)
            }
            onSuccess()
            Log.d(TAG, "Recibo impreso: ${data.ventaId}")
        } catch (e: RemoteException) {
            val msg = "Error al imprimir: ${e.message}"
            Log.e(TAG, msg)
            onError(msg)
        } catch (e: Exception) {
            val msg = when {
                e.message?.contains("paper") == true ->
                    "Sin papel. Instala un rollo nuevo e intenta de nuevo."
                else -> "Error de impresora: ${e.message}"
            }
            Log.e(TAG, msg)
            onError(msg)
        }
    }

    private fun formatTableHeader(): String = "CANT DESCRIPCION       TOTAL\n"

    private fun formatItemLine(item: ReceiptItem): String {
        val cantStr = "${item.cantidad}x".padEnd(4)
        val totalStr = "\$${formatMonto(item.total)}".padStart(8)
        val detalleMax = LINE_WIDTH - cantStr.length - totalStr.length - 1
        val detalle = truncate(item.detalle, detalleMax).padEnd(detalleMax)
        return "$cantStr$detalle$totalStr\n"
    }

    private fun formatMonto(monto: Double): String = "%.2f".format(monto)

    private fun truncate(text: String, maxLength: Int): String =
        if (text.length > maxLength) text.substring(0, maxLength - 1) + "…"
        else text
}
