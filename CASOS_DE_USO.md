# Casos de Uso — JoyasPOS v2.0
**Versión:** 2.0.0 | **Fecha:** 2026-06-29
> 🆕 = nuevo en v2

---

## Actores

| Actor | Descripción |
|---|---|
| **Vendedor** | Opera la app Sunmi V2SE; registra ventas |
| **Administrador** | Acceso completo; gestiona desde panel web y app |
| **SyncWorker** | Actor del sistema; sincroniza ventas pendientes en background |
| **Sistema API** | Fastify REST; persiste datos en MySQL |

---

## CU-01: Iniciar Sesión

| | |
|---|---|
| **Actores** | Vendedor, Admin |
| **Precondición** | Usuario activo existe en BD |
| **Disparador** | Usuario abre app o panel web |

**Flujo Principal:**
1. Sistema muestra formulario: username, password.
2. Actor ingresa datos y presiona "Ingresar".
3. API valida bcrypt; genera JWT `{ sub, username, rol, exp: +8h }`.
4. Cliente almacena JWT (DataStore en app / localStorage en web).
5. Navega a pantalla principal según rol y componente.

**Flujos Alternativos:**
- **FA-01A** Credenciales inválidas → "Usuario o contraseña incorrectos."
- **FA-01B** Error de red → "Error de conexión. Verifica tu red."
- **FA-01C** Usuario inactivo → "Tu cuenta ha sido desactivada."

**Postcondición:** Actor autenticado con JWT válido por 8 horas.

---

## CU-02: Registrar Venta (Offline-First) 🆕

| | |
|---|---|
| **Actores** | Vendedor, Admin |
| **Precondición** | Actor autenticado; al menos un producto en caché Room |
| **Disparador** | Vendedor selecciona un producto en HomeScreen |

**Flujo Principal:**
1. HomeScreen muestra listado de productos desde Room (caché local).
2. Vendedor selecciona producto → modal AddItem.
3. Ingresa Cantidad (obligatorio > 0), Precio unitario (obligatorio > 0), Detalle adicional (opcional).
4. Subtotal calculado en tiempo real. Vendedor confirma → ítem agregado al carrito con `detalle = "{nombre_producto} {detalle_adicional}".trim()`.
5. Repite pasos 2-4 para más productos.
6. Vendedor navega al carrito; revisa ítems y total.
7. (Opcional) Ingresa nombre del cliente; si vacío → "Clientes Varios".
8. Presiona "Confirmar venta".
9. **Sistema INSERT en Room** con `sincronizado = false`, `remoteId = null`.
10. Sistema intenta POST /ventas online.
    - **Online exitoso:** `sincronizado = true`, `remoteId = id_mysql`; existencias descontadas en MySQL.
    - **Sin conexión / error:** permanece `sincronizado = false`; SyncWorker encolado con `NetworkType.CONNECTED`.
11. Sistema navega a SaleConfirmationScreen (siempre, independiente del resultado online).
12. Sistema llama `SunmiPrintHelper.printReceipt(venta)` → imprime recibo térmico.
13. Carrito limpiado.

**Flujos Alternativos:**
- **FA-02A** Carrito vacío al confirmar → botón deshabilitado; mensaje "Agrega al menos un producto."
- **FA-02B** Impresora sin papel → AlertDialog "Reintentar impresión" (venta ya registrada).
- **FA-02C** Eliminar ítem del carrito → total recalculado → continúa en paso 6.

**Postcondición:** Venta en Room (sincronized o pendiente); recibo impreso; carrito limpio.

---

## CU-03: Sincronización Automática (SyncWorker) 🆕

| | |
|---|---|
| **Actores** | SyncWorker (sistema), API |
| **Precondición** | Hay ventas en Room con `sincronizado = false` |
| **Disparador** | Conexión de red disponible O timer periódico (15 min) O OneTimeWork tras falla |

**Flujo Principal:**
1. SyncWorker consulta Room: `SELECT * FROM ventas WHERE sincronizado = 0`.
2. Si lista vacía → Worker finaliza (Result.success()).
3. Divide en lotes de ≤ 20 ventas.
4. POST /ventas/sync con lote actual.
5. API procesa en orden cronológico; aplica lógica idéntica a RF-VENTA-01 por ítem.
6. API retorna `{ sincronizadas: [{local_id, remote_id}], errores: [...] }`.
7. Worker actualiza Room para cada éxito: `sincronizado = true`, `remoteId = remote_id`.
8. Ventas con error permanecen `sincronizado = false` para próximo reintento.
9. Repite con siguiente lote hasta agotar.

**Flujos Alternativos:**
- **FA-03A** Sin conexión al ejecutar → Worker retorna `Result.retry()`; backoff exponencial (1→2→4→8→16 min); máx 5 intentos.
- **FA-03B** API retorna error 5xx → igual que FA-03A.
- **FA-03C** Venta duplicada (ya existe por timestamp+usuario+monto) → API retorna remote_id sin duplicar; Worker la marca sincronizada.

**Postcondición:** Ventas exitosas con `sincronizado = true` y `remoteId` asignado; pendientes para reintento.

---

## CU-04: Imprimir Recibo Térmico 🆕

| | |
|---|---|
| **Actores** | Vendedor |
| **Precondición** | Venta registrada en Room (local_id existe); SunmiPrintHelper inicializado |
| **Disparador** | Navegación a SaleConfirmationScreen O botón "Reimprimir" en SaleDetailScreen |

**Flujo Principal:**
1. SunmiPrintHelper verifica disponibilidad de impresora (AIDL bind).
2. Construye layout del recibo:
   - Nombre del negocio (centrado, bold)
   - Separador `================================`
   - Fecha/Hora: `DD/MM/YYYY HH:MM`
   - Venta #: remote_id si existe, `L-{local_id}` si offline
   - Cliente, Vendedor
   - Separador `--------------------------------`
   - Por cada ítem: cantidad, descripción (detalle), subtotal (alineado a la derecha)
   - Separador `--------------------------------`
   - TOTAL (bold, grande)
   - Separador `================================`
   - "Gracias por su compra" (centrado)
3. Ejecuta impresión; 2 saltos de línea + corte de papel.

**Flujos Alternativos:**
- **FA-04A** Impresora no disponible (sin papel, error hardware) → AlertDialog con opciones "Reintentar" o "Omitir".
- **FA-04B** Reimpresión desde historial → mismo flujo; el ID del recibo puede ser local o remoto según estado.

**Postcondición:** Recibo impreso; si falló, actor decidió reintentar u omitir (venta ya registrada en ambos casos).

---

## CU-05: Consultar Ventas por Período (App)

| | |
|---|---|
| **Actores** | Vendedor (sus ventas), Admin (todas) |
| **Precondición** | Actor autenticado |
| **Disparador** | Navega a "Consultar ventas" |

**Flujo Principal:**
1. Pantalla muestra atajos: Hoy / Esta semana / Esta quincena / Este mes.
2. Actor selecciona atajo (o rango personalizado con DatePicker).
3. Sistema calcula `desde` y `hasta` según atajo:
   - **Hoy:** `00:00:00` a `23:59:59` del día actual
   - **Esta semana:** Lunes de la semana actual a hoy
   - **Esta quincena:** día ≤ 15 → 1 al 15; día > 15 → 16 al último día del mes
   - **Este mes:** 1 al último día del mes actual
4. Sistema consulta Room: ventas del período (incluye pendientes y sincronizadas).
5. Lista con: fecha/hora, cliente, monto, chip de estado (naranja=pendiente).
6. Total acumulado del período al pie.
7. Actor toca una venta → SaleDetailScreen con cabecera + ítems + botón reimprimir.

**Flujos Alternativos:**
- **FA-05A** Sin ventas en período → "Sin ventas en este período."
- **FA-05B** Rango personalizado → DatePicker de inicio y fin → continúa en paso 4.

---

## CU-06: Registrar Compra / Abastecimiento 🆕

| | |
|---|---|
| **Actores** | Admin |
| **Precondición** | Admin autenticado; al menos un producto activo |
| **Disparador** | Admin presiona "Nueva compra" en panel web |

**Flujo Principal:**
1. Sistema muestra formulario:
   - Proveedor: selector del catálogo O campo de texto libre
   - Fecha (default: hoy)
   - Notas (opcional)
   - Tabla de ítems: [Producto ▼] [Cantidad] [Costo unitario] [Subtotal] [Eliminar]
2. Admin selecciona productos con cantidad y costo unitario; monto total en tiempo real.
3. Admin puede agregar N ítems.
4. Admin presiona "Confirmar compra" → sistema pide confirmación.
5. POST /compras (transacción atómica en Prisma):
   a. Calcular monto_total = Σ (cantidad × costo_unitario)
   b. INSERT compras
   c. INSERT compra_detalle (N filas)
   d. UPDATE productos: existencia += cantidad (por ítem)
6. HTTP 201 → sistema redirige al historial de compras con mensaje de éxito.

**Flujos Alternativos:**
- **FA-06A** Sin ítems → botón "Confirmar" deshabilitado.
- **FA-06B** Proveedor no seleccionado Y nombre libre vacío → error "Indica un proveedor."
- **FA-06C** Cantidad o costo ≤ 0 → error por campo.
- **FA-06D** Error de red → mensaje de error; datos del formulario conservados.

**Postcondición:** Compra registrada; existencias actualizadas; historial actualizado.

---

## CU-07: Gestionar Proveedores 🆕

| | |
|---|---|
| **Actores** | Admin |
| **Precondición** | Admin autenticado |
| **Disparador** | Admin navega a "Proveedores" |

**Crear Proveedor:**
1. Admin → "Nuevo proveedor" → formulario: nombre*, contacto, teléfono, dirección.
2. POST /proveedores → HTTP 201 → tabla actualizada.

**Editar Proveedor:**
1. Admin selecciona fila → formulario precargado → modifica → PUT /proveedores/:id.

**Desactivar Proveedor:**
1. Admin → "Desactivar" → confirmación → DELETE /proveedores/:id → `activo=0`.
2. Si tiene compras asociadas: se desactiva pero el historial queda intacto.

**Reactivar:** Admin activa toggle → PATCH (o PUT) → `activo=1`.

---

## CU-08: Consultar Reportes (Panel Web) 🆕

| | |
|---|---|
| **Actores** | Admin |
| **Precondición** | Admin autenticado; datos en BD |
| **Disparador** | Admin navega a cualquier sección de Reportes |

**Flujo General (aplica a todos los reportes):**
1. Admin selecciona tipo de reporte desde el menú lateral.
2. Sistema presenta filtros de período (atajos + personalizado).
3. Admin selecciona período.
4. Sistema ejecuta el endpoint de reporte correspondiente.
5. Sistema renderiza KPIs + gráficas + tablas con los datos.
6. Admin puede cambiar el período; los gráficos se actualizan (TanStack Query refetch).

**Reportes disponibles:**

| Reporte | Endpoint | Visualizaciones |
|---|---|---|
| Ventas por período | GET /reportes/ventas | KPIs + LineChart por día + tabla por vendedor + tabla transacciones |
| Productos más vendidos | GET /reportes/productos-top | KPIs + BarChart horizontal top 10 + tabla con % |
| Movimiento inventario | GET /reportes/inventario | Tabla: entradas/salidas/balance; rojo si negativo |
| Rentabilidad estimada | GET /reportes/rentabilidad | KPI margen global + tabla ordenable con semáforo % |
| Compras por período | GET /reportes/compras | KPIs + LineChart + tabla por proveedor |

**Flujos Alternativos:**
- **FA-08A** Sin datos en el período → gráficas vacías con mensaje "Sin datos para este período."
- **FA-08B** Error de API → mensaje de error con botón "Reintentar."

---

## CU-09: Gestionar Usuarios

| | |
|---|---|
| **Actores** | Admin |
| **Precondición** | Admin autenticado |

**Crear:** POST /usuarios → `{ username, password, nombre_completo, rol }` → bcrypt hash.
**Editar:** PUT /usuarios/:id → `{ nombre_completo, rol }`.
**Contraseña:** PUT /usuarios/:id/password → `{ password }` (mínimo 6 chars) → nuevo hash.
**Desactivar:** DELETE /usuarios/:id → `activo=0`; bloqueado si es el propio usuario.

---

## Matriz Actores × Casos de Uso

| Caso de Uso | Vendedor | Admin | SyncWorker |
|---|---|---|---|
| CU-01 Iniciar Sesión | ✅ | ✅ | — |
| CU-02 Registrar Venta (offline-first) | ✅ | ✅ | — |
| CU-03 Sincronización Automática | — | — | ✅ |
| CU-04 Imprimir Recibo | ✅ | ✅ | — |
| CU-05 Consultar Ventas (App) | ✅ (sus ventas) | ✅ (todas) | — |
| CU-06 Registrar Compra | ❌ | ✅ | — |
| CU-07 Gestionar Proveedores | ❌ | ✅ | — |
| CU-08 Consultar Reportes (Web) | ❌ | ✅ | — |
| CU-09 Gestionar Usuarios | ❌ | ✅ | — |
