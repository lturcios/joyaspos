---
name: sunmi-printer-sdk
description: |
  Integra el Sunmi Printer SDK (AIDL / InnerPrinterManager) en la app Android de
  JoyasPOS: SunmiPrintHelper como singleton inyectable por Hilt, construcción del
  layout del recibo térmico (nombre negocio, fecha, número de venta, cliente,
  vendedor, tabla de ítems alineada, total, corte de papel), manejo de errores de
  impresora (sin papel, no disponible), AlertDialog de reintento, e ID condicional
  (#L-{localId} si offline vs remoteId si sincronizado). También incluye el botón
  de reimpresión desde SaleDetailScreen. Usar al implementar la impresión por primera
  vez, al ajustar el formato del recibo, o al depurar errores de conexión con la
  impresora Sunmi. Depende de SKILL-10 (android-project-structure) y
  SKILL-17 (hilt-dependency-injection).
---

> **⚠️ MULTITENANCY — LEER PRIMERO `skills/multitenancy-empresa-sucursal/SKILL.md`.**
> Esta skill fue escrita antes del requisito multiempresa/multisucursal. La skill
> de multitenancy define deltas OBLIGATORIOS que modifican el código de esta skill
> (campos `empresa_id`/`sucursal_id`, JWT extendido, scoping por sucursal en todos
> los queries, selector de sucursal, aislamiento de datos locales). Donde ambas
> se contradigan, gana la skill de multitenancy.


# SKILL-18 — Sunmi Printer SDK (apps/mobile)

## Paquete
`com.ltsoft.joyaspos.print`

---

## 1. Agregar el SDK al proyecto

El SDK de Sunmi se distribuye como `.aar`. Descargarlo del portal Sunmi Developer
y copiarlo a `apps/mobile/app/libs/`:

```
app/libs/
└── SunmiPrinterService.aar
```

En `app/build.gradle.kts`, agregar en `dependencies`:
```kotlin
implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.aar", "*.jar"))))
```

---

## 2. SunmiPrintHelper

### `print/SunmiPrintHelper.kt`
```kotlin
package com.ltsoft.joyaspos.print

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.os.RemoteException
import android.util.Log
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.InnerResultCallback
import com.sunmi.peripheral.printer.SunmiPrinterService
import javax.inject.Inject
import javax.inject.Singleton

data class ReceiptData(
    val ventaId: String,           // "#L-{localId}" u "#R-{remoteId}"
    val fecha: String,             // "29/06/2026 10:30"
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

/**
 * Helper para manejar la impresora térmica integrada del Sunmi V2SE.
 * Se conecta al servicio de impresión vía AIDL al crear la instancia.
 */
@Singleton
class SunmiPrintHelper @Inject constructor(
    private val context: Context,
) {
    companion object {
        private const val TAG = "SunmiPrinter"
        private const val LINE_WIDTH = 32  // Caracteres por línea en papel 58mm
    }

    private var printerService: SunmiPrinterService? = null
    private var isConnected = false

    private val printerCallback = object : InnerPrinterCallback() {
        override fun onConnected(service: SunmiPrinterService?) {
            printerService = service
            isConnected = true
            Log.d(TAG, "Impresora conectada")
        }

        override fun onDisconnected() {
            printerService = null
            isConnected = false
            Log.w(TAG, "Impresora desconectada")
        }
    }

    init {
        bindPrinterService()
    }

    /** Conectar al servicio de impresión Sunmi */
    private fun bindPrinterService() {
        try {
            InnerPrinterManager.getInstance().bindService(context, printerCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error al conectar con el servicio de impresión: ${e.message}")
        }
    }

    /** Desconectar (llamar en Application.onTerminate o cuando ya no se necesite) */
    fun unbindService() {
        try {
            InnerPrinterManager.getInstance().unBindService(context, printerCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error al desconectar: ${e.message}")
        }
    }

    /**
     * Imprime el recibo de una venta.
     *
     * @param data Datos del recibo
     * @param onSuccess Callback si la impresión fue exitosa
     * @param onError Callback con mensaje de error si falló
     */
    fun printReceipt(
        data: ReceiptData,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {},
    ) {
        val service = printerService

        if (!isConnected || service == null) {
            onError("Impresora no disponible. Verifica que el papel esté instalado.")
            return
        }

        try {
            service.apply {
                // Inicializar impresora
                printerInit(null)

                // ── ENCABEZADO ─────────────────────────────────────────────
                setAlignment(1, null)              // Centrado
                setFontSize(28f, null)
                printText("${data.nombreNegocio}\n", null)

                setFontSize(20f, null)
                printText("================================\n", null)

                // ── DATOS DE LA VENTA ──────────────────────────────────────
                setAlignment(0, null)              // Izquierda
                setFontSize(20f, null)

                printText("Fecha  : ${data.fecha}\n", null)
                printText("Venta  : ${data.ventaId}\n", null)
                printText("Cliente: ${truncate(data.cliente, 22)}\n", null)
                printText("Vendor : ${truncate(data.vendedor, 22)}\n", null)

                printText("--------------------------------\n", null)

                // ── ENCABEZADO DE TABLA ────────────────────────────────────
                setFontSize(18f, null)
                printText(formatTableHeader(), null)
                printText("--------------------------------\n", null)

                // ── ÍTEMS ──────────────────────────────────────────────────
                setFontSize(18f, null)
                data.items.forEach { item ->
                    printText(formatItemLine(item), null)
                }

                // ── TOTAL ──────────────────────────────────────────────────
                setFontSize(20f, null)
                printText("--------------------------------\n", null)
                setAlignment(2, null)              // Derecha
                printText("TOTAL: \$${formatMonto(data.montoTotal)}\n", null)

                // ── PIE ────────────────────────────────────────────────────
                setAlignment(1, null)
                setFontSize(18f, null)
                printText("================================\n", null)
                printText("   Gracias por su compra\n", null)
                printText("================================\n", null)

                // Avance de papel y corte
                lineWrap(3, null)
                cutPaper(null)
            }

            onSuccess()
            Log.d(TAG, "Recibo impreso exitosamente: ${data.ventaId}")

        } catch (e: RemoteException) {
            val msg = "Error al imprimir: ${e.message}"
            Log.e(TAG, msg)
            onError(msg)
        } catch (e: Exception) {
            val msg = when {
                e.message?.contains("paper") == true -> "Sin papel. Instala un rollo nuevo e intenta de nuevo."
                else -> "Error de impresora: ${e.message}"
            }
            Log.e(TAG, msg)
            onError(msg)
        }
    }

    // ── Helpers de formato ─────────────────────────────────────────────────────

    private fun formatTableHeader(): String = "CANT DESCRIPCION       TOTAL\n"

    private fun formatItemLine(item: ReceiptItem): String {
        val cantStr = "${item.cantidad.toInt()}x".padEnd(4)
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
```

---

## 3. Módulo Hilt

```kotlin
// di/PrintModule.kt
@Module
@InstallIn(SingletonComponent::class)
object PrintModule {

    @Provides
    @Singleton
    fun provideSunmiPrintHelper(
        @ApplicationContext context: Context
    ): SunmiPrintHelper = SunmiPrintHelper(context)
}
```

---

## 4. SaleConfirmationScreen — impresión automática

```kotlin
// presentation/confirmation/SaleConfirmationScreen.kt
@Composable
fun SaleConfirmationScreen(
    localId: Long,
    viewModel: ConfirmationViewModel = hiltViewModel(),
    onNuevaVenta: () -> Unit,
) {
    val venta by viewModel.venta.collectAsStateWithLifecycle()
    val printError by viewModel.printError.collectAsStateWithLifecycle()

    // Imprimir automáticamente al entrar a la pantalla
    LaunchedEffect(venta) {
        venta?.let { viewModel.imprimirRecibo(it) }
    }

    // AlertDialog si hay error de impresora
    printError?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.clearPrintError() },
            title = { Text("Error de impresora") },
            text = { Text(error) },
            confirmButton = {
                Button(onClick = { venta?.let { viewModel.imprimirRecibo(it) } }) {
                    Text("Reintentar")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.clearPrintError() }) {
                    Text("Omitir")
                }
            }
        )
    }

    // UI de confirmación...
}
```

### `presentation/confirmation/ConfirmationViewModel.kt`
```kotlin
@HiltViewModel
class ConfirmationViewModel @Inject constructor(
    private val ventaRepository: VentaRepository,
    private val sessionPreferences: SessionPreferences,
    private val printHelper: SunmiPrintHelper,
) : ViewModel() {

    private val _printError = MutableStateFlow<String?>(null)
    val printError: StateFlow<String?> = _printError.asStateFlow()

    fun imprimirRecibo(venta: VentaEntity) {
        viewModelScope.launch {
            val items = ventaRepository.getDetallesByVentaId(venta.id)
            val username = sessionPreferences.getUsername().firstOrNull() ?: ""

            val ventaId = if (venta.remoteId != null)
                "#R-${venta.remoteId}"
            else
                "#L-${venta.id}"

            val receiptData = ReceiptData(
                ventaId = ventaId,
                fecha = formatDateTime(venta.fechaHora),
                cliente = venta.nombreCliente,
                vendedor = username,
                items = items.map { item ->
                    ReceiptItem(
                        detalle = item.detalle,
                        cantidad = item.cantidad,
                        precioUnitario = item.precioUnitario,
                        total = item.total,
                    )
                },
                montoTotal = venta.montoTotal,
            )

            printHelper.printReceipt(
                data = receiptData,
                onSuccess = { _printError.value = null },
                onError = { msg -> _printError.value = msg },
            )
        }
    }

    fun clearPrintError() { _printError.value = null }

    private fun formatDateTime(iso: String): String {
        return try {
            val instant = java.time.Instant.parse(iso)
            val local = java.time.ZoneId.of("America/El_Salvador")
                .let { instant.atZone(it).toLocalDateTime() }
            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(local)
        } catch (e: Exception) { iso }
    }
}
```

---

## 5. Reglas críticas

1. **La impresión nunca bloquea ni revierte la venta** — si falla, la venta ya está en Room y/o en la API.
2. **ID condicional en el recibo:**
   - Si `remoteId != null` → `#R-{remoteId}` (sincronizado con MySQL)
   - Si `remoteId == null` → `#L-{localId}` (solo en Room, pendiente de sync)
3. **El AlertDialog de error siempre muestra "Reintentar" y "Omitir"** — nunca forzar al vendedor a imprimir.
4. **`SunmiPrintHelper` es `@Singleton`** — el binding al servicio AIDL ocurre una sola vez.
5. **Nunca instanciar `SunmiPrintHelper` directamente** en un Composable o ViewModel — siempre inyectado por Hilt.
6. **Probar en dispositivo Sunmi real** — el emulador no tiene la impresora; las pruebas en emulador siempre fallarán en el binding.
