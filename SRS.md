# SRS — JoyasPOS v2.0
## Software Requirements Specification
**Versión:** 2.0.0 | **Fecha:** 2026-06-29 | **Autor:** LTSOFT Ingeniería Informática

---

## 1. Definiciones clave v2

| Término | Definición |
|---|---|
| Room | ORM Android sobre SQLite para persistencia local |
| WorkManager | API Android para tareas en segundo plano garantizadas |
| SyncWorker | Worker que sincroniza ventas pendientes con la API |
| `sincronizado` | Flag BOOLEAN en Room: false=pendiente, true=subido a API |
| `remote_id` | ID MySQL asignado tras sync exitoso (null si pendiente) |
| Offline-first | App escribe en Room primero, siempre |
| Recibo térmico | Comprobante impreso en impresora interna del Sunmi V2SE |
| Sunmi Printer SDK | Librería oficial AIDL para controlar la impresora Sunmi |
| Compra | Registro de abastecimiento con costo unitario por ítem |
| Proveedor | Entidad que suministra mercancía al negocio |

---

## 2. Arquitectura del sistema

```
Sunmi V2SE (Room local — offline-first)
       ↕ WorkManager SyncWorker (automático)
       ↕ Retrofit directo cuando hay conexión
API REST Fastify/Node.js ←→ MySQL 8 VPS Oracle
              ↑
       Panel Web React
```

### 2.1 Estrategia offline-first
1. Toda venta → INSERT en Room con `sincronizado = false`
2. Intento inmediato de POST /ventas online
3. Si OK → `sincronizado = true`, `remote_id = id_mysql`
4. Si falla → permanece `sincronizado = false`
5. SyncWorker detecta pendientes y reenvía con backoff exponencial

---

## 3. RF — Autenticación

### RF-AUTH-01: Login
- Endpoint: `POST /auth/login`
- Entrada: `{ username, password }`
- Proceso: verificar bcrypt hash; generar JWT `{ sub, username, rol, exp: +8h }`
- OK: HTTP 200 + `{ token, user: { id, username, nombre_completo, rol } }`
- KO: HTTP 401 `{ error: "Credenciales inválidas" }`

### RF-AUTH-02: Protección de endpoints
- Todos excepto POST /auth/login requieren `Authorization: Bearer <token>`
- Token inválido/expirado → HTTP 401

### RF-AUTH-03: Roles
- vendedor: listar productos, registrar ventas, consultar sus ventas
- admin: todo + gestión de productos, usuarios, compras, proveedores, reportes

---

## 4. RF — Productos

### RF-PROD-01: Listar activos
- `GET /productos` — todos los roles
- Solo `activo=1`; orden alfabético
- Respuesta: `[{ id, nombre, unidad_medida, existencia }]`

### RF-PROD-02: Crear
- `POST /productos` — admin
- Obligatorios: nombre (único), unidad_medida
- HTTP 201 + producto con ID autogenerado

### RF-PROD-03: Editar
- `PUT /productos/:id` — admin
- Editables: nombre, unidad_medida (existencia no se edita aquí)

### RF-PROD-04: Desactivar
- `DELETE /productos/:id` — admin; soft delete `activo=0`

### RF-PROD-05: Ingreso manual de existencias
- `POST /productos/:id/ingreso` — admin
- Body: `{ cantidad: number }` (> 0)
- `existencia = existencia + cantidad`
- Respuesta: `{ id, nombre, existencia_anterior, existencia_nueva }`

---

## 5. RF — Ventas

### RF-VENTA-01: Registrar venta (online)
- `POST /ventas` — todos los roles
- Body:
```json
{
  "nombre_cliente": "string|null",
  "fecha_hora": "ISO8601",
  "items": [
    { "producto_id": 1, "cantidad": 2, "precio_unitario": 15.50, "detalle_adicional": "talla M" }
  ]
}
```
- Proceso (transacción atómica Prisma):
  1. nombre_cliente null/vacío → "Clientes Varios"
  2. detalle = "{nombre_producto} {detalle_adicional}".trim()
  3. total_item = cantidad × precio_unitario
  4. monto_total = Σ total_item
  5. INSERT ventas + INSERT venta_detalle
  6. UPDATE productos: existencia -= cantidad por ítem
- HTTP 201 + venta completa con id

### RF-VENTA-02: Sincronización batch (offline→online)
- `POST /ventas/sync` — todos los roles
- Body: `{ ventas: [VentaPayload[]] }`
- Procesa en orden cronológico; misma lógica que RF-VENTA-01 por elemento
- Respuesta: `{ sincronizadas: [{local_id, remote_id}], errores: [...] }`
- Idempotencia: detecta duplicados por timestamp+usuario+monto; retorna remote_id sin duplicar

### RF-VENTA-03: Listar por período
- `GET /ventas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`
- vendedor: solo sus ventas; admin: todas
- Descendente por fecha_hora; incluye vendedor.username

### RF-VENTA-04: Detalle de venta
- `GET /ventas/:id`
- vendedor: solo sus ventas; admin: cualquiera
- Respuesta: cabecera + items[]

---

## 6. RF — Compras y Proveedores (NUEVO)

### RF-PROV-01 a RF-PROV-04: CRUD Proveedores
- `GET /proveedores` — lista activos (admin)
- `POST /proveedores` — crear: nombre (oblig.), contacto, telefono, direccion (admin)
- `PUT /proveedores/:id` — editar (admin)
- `DELETE /proveedores/:id` — soft delete activo=0 (admin)

### RF-COMP-01: Registrar compra
- `POST /compras` — admin
- Body:
```json
{
  "proveedor_id": 1,
  "proveedor_nombre": "Distribuidora XYZ (si no está en catálogo)",
  "notas": "opcional",
  "items": [
    { "producto_id": 1, "cantidad": 10, "costo_unitario": 8.00 }
  ]
}
```
- Reglas: al menos proveedor_id O proveedor_nombre; cantidad > 0; costo > 0
- Proceso (transacción atómica Prisma):
  1. monto_total = Σ (cantidad × costo_unitario)
  2. INSERT compras + INSERT compra_detalle
  3. UPDATE productos: existencia += cantidad por ítem
- HTTP 201 + compra con id

### RF-COMP-02: Listar compras por período
- `GET /compras?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` — admin
- Descendente; incluye proveedor y usuario

### RF-COMP-03: Detalle de compra
- `GET /compras/:id` — admin; cabecera + items[] con nombre producto

---

## 7. RF — Reportes (NUEVO)

Todos los endpoints: `GET`, rol admin, parámetros `desde` y `hasta`.

### RF-REP-01: Ventas por período
- `GET /reportes/ventas?desde=&hasta=`
- Respuesta: `{ total_ventas, cantidad_transacciones, ticket_promedio, por_dia: [{fecha, monto, cantidad}], por_vendedor: [{username, monto, cantidad}] }`

### RF-REP-02: Productos más vendidos
- `GET /reportes/productos-top?desde=&hasta=&limit=10`
- Respuesta: `[{ producto_id, nombre, cantidad_total, monto_total }]` desc por monto_total

### RF-REP-03: Movimiento de inventario
- `GET /reportes/inventario?desde=&hasta=`
- Por producto: `{ id, nombre, existencia_actual, entradas, salidas, balance }`

### RF-REP-04: Rentabilidad estimada
- `GET /reportes/rentabilidad?desde=&hasta=`
- Compara precio_unitario ventas vs costo_unitario compras por producto
- Respuesta: `[{ producto_id, nombre, ingresos, costos, margen, margen_pct }]`

### RF-REP-05: Dashboard resumen del día
- `GET /reportes/dashboard`
- Respuesta: `{ ventas_hoy, ventas_ayer, ventas_semana: {monto, por_dia}, compras_semana, productos_stock_bajo, top_productos_hoy }`

### RF-REP-06: Compras por período
- `GET /reportes/compras?desde=&hasta=`
- `{ total_compras, cantidad_ordenes, por_dia, por_proveedor }`

---

## 8. RF — App Móvil (Kotlin/Compose)

### RF-MOB-01: Entidades Room

**VentaEntity**
```kotlin
@Entity(tableName = "ventas")
data class VentaEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val remoteId: Long? = null,       // null si aún no sincronizado
    val nombreCliente: String,
    val montoTotal: Double,
    val fechaHora: String,            // ISO 8601
    val usuarioId: Long,
    val sincronizado: Boolean = false // FLAG principal de sincronización
)
```

**VentaDetalleEntity**
```kotlin
@Entity(tableName = "venta_detalle",
    foreignKeys = [ForeignKey(VentaEntity::class, ["id"], ["ventaLocalId"], onDelete = CASCADE)])
data class VentaDetalleEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val ventaLocalId: Long,
    val productoId: Long,
    val detalle: String,
    val cantidad: Double,
    val precioUnitario: Double,
    val total: Double
)
```

**ProductoEntity** (caché local)
```kotlin
@Entity(tableName = "productos")
data class ProductoEntity(
    @PrimaryKey val id: Long,
    val nombre: String,
    val unidadMedida: String,
    val existencia: Double,
    val activo: Boolean,
    val ultimaSync: Long             // timestamp Unix
)
```

### RF-MOB-02: DAOs requeridos
```kotlin
@Dao interface VentaDao {
    @Query("SELECT * FROM ventas WHERE sincronizado = 0")
    fun getPendientes(): Flow<List<VentaEntity>>

    @Query("SELECT * FROM ventas WHERE fechaHora BETWEEN :desde AND :hasta ORDER BY fechaHora DESC")
    fun getPorPeriodo(desde: String, hasta: String): Flow<List<VentaEntity>>

    @Insert fun insertar(venta: VentaEntity): Long
    @Update fun actualizar(venta: VentaEntity)
}

@Dao interface ProductoDao {
    @Query("SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC")
    fun getTodos(): Flow<List<ProductoEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(productos: List<ProductoEntity>)
}
```

### RF-MOB-03: SyncWorker
- Clase: `SyncWorker : CoroutineWorker`
- Triggers:
  - Periódico: cada 15 min (`PeriodicWorkRequest`)
  - Al reconectar: constraint `NetworkType.CONNECTED`
  - Inmediato: tras venta fallida online (`OneTimeWorkRequest`)
- Proceso:
  1. Room query: ventas WHERE sincronizado = 0
  2. POST /ventas/sync (lotes de ≤ 20)
  3. Éxito parcial: marcar exitosas, dejar fallidas
  4. UPDATE Room: sincronizado=true, remoteId asignado
  5. Backoff exponencial: 1→2→4→8→16 min; máx 5 reintentos

### RF-MOB-04: Repository Pattern
```
VentaRepository.registrarVenta(venta, items):
  1. INSERT en Room → localId
  2. Intentar POST /ventas online
  3. OK → UPDATE Room: sincronizado=true, remoteId
  4. Falla → dejar sincronizado=false; encolar SyncWorker

ProductoRepository.getProductos():
  1. Intentar GET /productos online → si OK, upsert en Room
  2. Si offline → retornar cache Room
  3. Emitir siempre Flow<List<ProductoEntity>> desde Room
```

### RF-MOB-05: Login Screen
- Campos: username, password (oculto)
- Éxito: token → DataStore; navegar a HomeScreen
- Error: mensaje visible en pantalla

### RF-MOB-06: HomeScreen
- Lista productos desde ProductoRepository (Room + sync background)
- Cada ítem: nombre, unidad de medida, existencia
- Búsqueda local por nombre (filtro sobre Flow)
- Badge en toolbar con cantidad de ítems en carrito
- Banner "Modo offline — sin conexión" si !hasNetwork
- Banner "X ventas pendientes de sincronizar" si hay pendientes

### RF-MOB-07: Modal Agregar Ítem
- Cantidad (numérico > 0), Precio unitario (decimal > 0), Detalle adicional (opcional)
- Subtotal en tiempo real
- Validación antes de agregar

### RF-MOB-08: CartScreen
- Lista ítems con subtotales y monto total
- Eliminar ítem individual
- Nombre cliente (placeholder "Clientes Varios")
- Botón "Confirmar venta" deshabilitado si carrito vacío o campos inválidos

### RF-MOB-09: Flujo de confirmación con impresión
1. Presionar "Confirmar venta"
2. INSERT en Room con sincronizado=false
3. Intent POST /ventas online
   - OK: sincronizado=true, remoteId
   - Falla: sincronizado=false, SyncWorker encolado
4. SIEMPRE navegar a SaleConfirmationScreen
5. SIEMPRE intentar imprimir recibo
6. Limpiar carrito

### RF-MOB-10: Impresión de recibo térmico Sunmi
- SDK: `com.sunmi:printerlibrary` (AIDL / InnerPrinterManager)
- Clase: `SunmiPrintHelper` inyectada por Hilt
- Contenido del recibo:
```
================================
       [NOMBRE DEL NEGOCIO]
================================
Fecha: DD/MM/YYYY HH:MM
Venta #: [L-localId o remoteId]
Cliente: [nombre_cliente]
Vendedor: [username]
--------------------------------
CANT  DESCRIPCIÓN        $TOTAL
[n]   [detalle]          [xxx]
--------------------------------
TOTAL:               $[monto]
================================
     Gracias por su compra
[2 saltos de línea + corte]
```
- Si impresora no lista: AlertDialog "Reintentar impresión" (la venta ya está registrada)
- Si offline: el ID en recibo es `#L-{localId}`; se actualiza al sincronizar pero no se reimprime

### RF-MOB-11: Indicadores de sincronización
- Chip naranja "Pendiente" en ventas con sincronizado=false
- Chip verde "Sincronizado" o sin indicador en ventas sincronizadas
- Banner en HomeScreen con cantidad de pendientes

### RF-MOB-12: SalesQueryScreen
- Atajos: Hoy / Esta semana / Esta quincena / Este mes
- DatePicker para rango personalizado
- Fuente: Room (muestra pendientes + sincronizadas)
- Total del período al pie
- Tap → SaleDetailScreen

### RF-MOB-13: SaleDetailScreen
- Cabecera: #venta, fecha, cliente, vendedor, estado sync
- Lista ítems: detalle, cantidad, precio unitario, subtotal
- Monto total
- Botón "Reimprimir recibo"

---

## 9. RF — Panel Web

### RF-WEB-01: Login
- Username + password; JWT en localStorage; redirige por rol

### RF-WEB-02: Dashboard
- KPIs: ventas hoy (monto + cantidad), delta % vs ayer (↑ verde, ↓ rojo)
- KPI ventas semana, KPI compras semana
- Gráfica de barras: ventas por día de la semana (Recharts LineChart)
- Alert productos con stock ≤ 5
- Top 5 productos del día

### RF-WEB-03: Productos
- Tabla con filtros; crear, editar, desactivar/reactivar, ingreso de existencias

### RF-WEB-04: Proveedores
- CRUD completo; soft delete; confirmación al desactivar

### RF-WEB-05: Nueva Compra
- Formulario cabecera: selector proveedor del catálogo O nombre libre; fecha; notas
- Tabla de ítems editable: selector producto + cantidad + costo unitario + subtotal calculado
- Monto total en tiempo real
- Confirmación antes de guardar; tras éxito redirige al historial

### RF-WEB-06: Historial de Compras
- Filtros de período; tabla: fecha, proveedor, monto, registrado por
- Click en fila → panel lateral con detalle de ítems
- Total acumulado del período

### RF-WEB-07: Reporte Ventas por Período
- KPIs: total monto, cantidad de transacciones, ticket promedio
- LineChart: ventas por día en el período
- Tabla por vendedor: username, monto, cantidad, ticket promedio
- Tabla de transacciones paginada: fecha, cliente, vendedor, monto

### RF-WEB-08: Reporte Productos Más Vendidos
- Filtro de período
- BarChart horizontal: top 10 por monto total
- Tabla: posición, producto, cantidad, monto, % del total

### RF-WEB-09: Reporte Movimiento de Inventario
- Tabla: producto, existencia actual, entradas, salidas, balance neto
- Rojo si balance negativo; filtro por nombre de producto

### RF-WEB-10: Reporte Rentabilidad
- Tabla ordenable: producto, ingresos, costos, margen $, margen %
- Verde > 30%, amarillo 10-30%, rojo < 10%
- KPI global: margen promedio del período

### RF-WEB-11: Reporte Compras por Período
- LineChart: monto comprado por día
- Tabla: proveedor, monto total, cantidad de órdenes

### RF-WEB-12: Existencias
- Tabla: productos activos + existencia
- Código de color: rojo ≤ 5, amarillo ≤ 15, verde > 15
- Ingreso de existencias por fila; exportar lista a CSV (generado en cliente)

### RF-WEB-13: Usuarios
- CRUD; soft delete; cambio de contraseña en modal
- Bloquear auto-desactivación del usuario autenticado

---

## 10. Requerimientos No Funcionales

| RNF | Detalle |
|---|---|
| RNF-01 Seguridad | bcrypt salt≥12; JWT secret≥32 chars en .env; HTTPS producción; CORS restringido |
| RNF-02 Rendimiento | GET /productos < 500ms; POST /ventas < 1s; reportes < 2s; impresión < 3s |
| RNF-03 Offline | Ventas registrables sin conexión; SyncWorker backoff exponencial (1→2→4→8→16 min); máx 5 reintentos |
| RNF-04 Usabilidad app | Toques ≥ 48dp; fuentes ≥ 14sp; WCAG AA contraste |
| RNF-05 Compatibilidad | Android 9+ API28; Node 20 LTS; últimas 2 versiones browsers modernos |
| RNF-06 Mantenibilidad | .env para config; migraciones solo por Prisma; Room con versiones de migración |
| RNF-07 Índices MySQL | Índices en fecha_hora, usuario_id, producto_id en ventas, venta_detalle, compras, compra_detalle |

---

## 11. Índices MySQL requeridos

```sql
CREATE INDEX idx_ventas_fecha ON ventas(fecha_hora);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_venta_detalle_producto ON venta_detalle(producto_id);
CREATE INDEX idx_venta_detalle_venta ON venta_detalle(venta_id);
CREATE INDEX idx_compras_fecha ON compras(fecha_hora);
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX idx_compra_detalle_producto ON compra_detalle(producto_id);
CREATE INDEX idx_compra_detalle_compra ON compra_detalle(compra_id);
```
