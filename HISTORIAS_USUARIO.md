# Historias de Usuario — JoyasPOS v2.0
**Versión:** 2.0.0 | **Fecha:** 2026-06-29 | **Autor:** LTSOFT Ingeniería Informática

> Formato: **Como** [actor], **quiero** [capacidad], **para** [beneficio].
> Cada historia incluye criterios de aceptación (CA) y estimación en Story Points (SP).
> 🆕 = agregado en v2

---

## ÉPICA 1 — Autenticación

### HU-AUTH-01: Login de usuario
**Como** vendedor o administrador,
**quiero** ingresar con mi username y contraseña,
**para** acceder de forma segura.

**CA:**
- CA1: Credenciales correctas → JWT guardado, navega a pantalla principal.
- CA2: Credenciales incorrectas → "Usuario o contraseña incorrectos."
- CA3: Contraseña oculta con opción de mostrar.
- CA4: Botón deshabilitado mientras la petición está en curso.
- CA5: El token persiste entre reinicios de la app (DataStore).

**SP:** 3

---

### HU-AUTH-02: Cerrar sesión
**Como** cualquier usuario,
**quiero** cerrar sesión desde la app o el panel web,
**para** proteger mi cuenta en el dispositivo.

**CA:**
- CA1: JWT eliminado del almacenamiento local.
- CA2: Redirige a Login.
- CA3: Carrito limpiado al cerrar sesión (app).

**SP:** 1

---

### HU-AUTH-03: Redirección por sesión expirada
**Como** vendedor,
**quiero** ser redirigido al Login si mi sesión expira,
**para** no recibir errores inesperados.

**CA:**
- CA1: API retorna 401 → token eliminado → Login con mensaje "Tu sesión ha expirado."

**SP:** 2

---

## ÉPICA 2 — Modo Offline / Sincronización 🆕

### HU-SYNC-01: Registrar venta sin conexión
**Como** vendedor,
**quiero** registrar ventas aunque no haya internet,
**para** no interrumpir mi trabajo por fallas de red.

**CA:**
- CA1: La venta se guarda localmente en Room con `sincronizado = false`.
- CA2: Aparece un banner "Modo offline" en la pantalla principal cuando no hay conexión.
- CA3: La confirmación de la venta se muestra normalmente (con ID local `#L-{id}`).
- CA4: El recibo se imprime correctamente aunque la venta no esté sincronizada.
- CA5: La venta offline aparece en el historial con chip naranja "Pendiente".

**SP:** 8

---

### HU-SYNC-02: Sincronización automática al reconectar
**Como** vendedor,
**quiero** que las ventas offline se sincronicen automáticamente cuando se restaure la conexión,
**para** no tener que hacerlo manualmente.

**CA:**
- CA1: El SyncWorker detecta ventas con `sincronizado = false` y las envía en lote.
- CA2: Al sincronizar exitosamente, el flag cambia a `true` y se asigna el `remote_id`.
- CA3: El chip "Pendiente" desaparece de la venta sincronizada.
- CA4: El banner de pendientes en HomeScreen desaparece cuando no hay ninguno.
- CA5: Si hay errores parciales, las ventas fallidas siguen con `sincronizado = false` para reintento.
- CA6: El backoff es exponencial: 1 → 2 → 4 → 8 → 16 min; máximo 5 reintentos.

**SP:** 8

---

### HU-SYNC-03: Visualizar estado de sincronización
**Como** vendedor,
**quiero** saber cuáles ventas están pendientes de sincronizar,
**para** estar al tanto del estado del sistema.

**CA:**
- CA1: HomeScreen muestra banner "X venta(s) pendiente(s) de sincronizar" si las hay.
- CA2: En el historial de ventas, cada venta muestra su estado: chip naranja "Pendiente" o sin chip (sincronizada).
- CA3: El detalle de venta indica el estado y si tiene remote_id o ID local.

**SP:** 3

---

## ÉPICA 3 — Impresión de Recibo Térmico 🆕

### HU-IMP-01: Imprimir recibo al confirmar venta
**Como** vendedor,
**quiero** que se imprima un recibo automáticamente al confirmar la venta,
**para** entregárselo al cliente.

**CA:**
- CA1: El recibo se imprime siempre tras confirmar, independientemente del estado de conexión.
- CA2: El recibo incluye: nombre del negocio, fecha/hora, número de venta, cliente, vendedor, lista de ítems con subtotales y monto total.
- CA3: Si la impresora no está lista (sin papel, error), se muestra alerta con opción "Reintentar".
- CA4: La venta ya está registrada (local o remotamente) aunque falle la impresión.
- CA5: Si la venta es offline, el ID en el recibo es `#L-{localId}`.

**SP:** 5

---

### HU-IMP-02: Reimprimir recibo desde el historial
**Como** vendedor,
**quiero** poder reimprimir el recibo de una venta anterior,
**para** entregar un duplicado si el cliente lo requiere.

**CA:**
- CA1: La pantalla de detalle de venta tiene el botón "Reimprimir recibo".
- CA2: La impresión usa los mismos datos que el recibo original.
- CA3: El error de impresora se maneja con la misma alerta de reintento.

**SP:** 2

---

## ÉPICA 4 — Gestión de Productos (Admin — Web)

### HU-PROD-01: Crear producto
**Como** administrador,
**quiero** crear productos con nombre y unidad de medida,
**para** que estén disponibles en la app de los vendedores.

**CA:**
- CA1: Nombre y unidad de medida son obligatorios.
- CA2: Nombre único; error "Ya existe un producto con ese nombre" si duplicado.
- CA3: ID autogenerado por la BD.
- CA4: Producto activo y con existencia configurable al crear (default 0).

**SP:** 3

---

### HU-PROD-02: Editar producto
**Como** administrador,
**quiero** editar nombre y unidad de medida de un producto,
**para** corregir errores sin crear uno nuevo.

**CA:**
- CA1: Solo editables nombre y unidad_medida.
- CA2: Formulario precarga valores actuales.
- CA3: Cambios visibles en la app en la siguiente sincronización.

**SP:** 2

---

### HU-PROD-03: Desactivar / reactivar producto
**Como** administrador,
**quiero** desactivar productos discontinuados y reactivar los que regresen,
**para** mantener el catálogo limpio sin perder historial.

**CA:**
- CA1: Desactivado no aparece en app móvil.
- CA2: Historial de ventas con ese producto se conserva.
- CA3: Se confirma antes de desactivar.
- CA4: Puede reactivarse desde el mismo panel.

**SP:** 2

---

### HU-PROD-04: Ingresar existencias
**Como** administrador,
**quiero** incrementar manualmente el stock de un producto,
**para** reflejar entradas no vinculadas a una compra formal.

**CA:**
- CA1: Solo cantidad > 0.
- CA2: Existencia acumulada: `nueva = actual + ingresada`.
- CA3: Se muestra anterior y nueva al confirmar.
- CA4: No se puede ingresar stock a productos inactivos.

**SP:** 2

---

## ÉPICA 5 — Registro de Ventas (App Móvil)

### HU-VENTA-01: Ver listado de productos
**Como** vendedor,
**quiero** ver todos los productos disponibles en la pantalla principal,
**para** seleccionar qué agregar a la venta.

**CA:**
- CA1: Solo productos activos; orden alfabético.
- CA2: Cada ítem muestra nombre, unidad de medida y existencia.
- CA3: Buscador de filtrado local en tiempo real.
- CA4: Si offline, usa caché Room; si online, refresca Room en background.

**SP:** 3

---

### HU-VENTA-02: Agregar producto al carrito
**Como** vendedor,
**quiero** especificar cantidad, precio y detalle adicional al agregar un producto,
**para** construir el carrito de la venta.

**CA:**
- CA1: Modal con campos: Cantidad (obligatorio > 0), Precio unitario (obligatorio > 0), Detalle adicional (opcional).
- CA2: Subtotal calculado en tiempo real.
- CA3: El campo `detalle` se construye como `"{nombre_producto} {detalle_adicional}"`.trim().
- CA4: Se puede agregar el mismo producto más de una vez (líneas independientes).

**SP:** 5

---

### HU-VENTA-03: Gestionar carrito
**Como** vendedor,
**quiero** ver y modificar el carrito antes de confirmar,
**para** revisar la venta antes de cerrarla.

**CA:**
- CA1: Lista ítems con detalle, cantidad, precio, subtotal.
- CA2: Monto total visible de forma prominente.
- CA3: Eliminar ítems individuales.
- CA4: Badge en toolbar con cantidad de ítems.

**SP:** 3

---

### HU-VENTA-04: Confirmar venta (online u offline)
**Como** vendedor,
**quiero** confirmar la venta para registrarla y obtener el recibo,
**para** completar la transacción.

**CA:**
- CA1: Se guarda en Room con `sincronizado = false`.
- CA2: Se intenta POST /ventas; si OK → `sincronizado = true`, `remote_id` asignado.
- CA3: Si falla → permanece pendiente; SyncWorker encolado.
- CA4: SIEMPRE navega a confirmación y SIEMPRE intenta imprimir recibo.
- CA5: Carrito limpiado después de confirmar.
- CA6: Si carrito vacío o datos inválidos, botón "Confirmar" deshabilitado.

**SP:** 5

---

## ÉPICA 6 — Consulta de Ventas (App Móvil)

### HU-CONS-01: Consultar ventas por período
**Como** vendedor o administrador,
**quiero** consultar las ventas de un período con atajos predefinidos,
**para** hacer seguimiento de lo vendido.

**CA:**
- CA1: Atajos: Hoy, Esta semana, Esta quincena, Este mes.
- CA2: Selector de rango personalizado.
- CA3: Lista con fecha/hora, cliente, monto, estado de sincronización.
- CA4: Total del período al pie.
- CA5: Vendedor ve solo sus ventas; admin ve todas.
- CA6: Fuente: Room local (incluye pendientes y sincronizadas).

**SP:** 5

---

### HU-CONS-02: Ver detalle de venta
**Como** vendedor o administrador,
**quiero** ver el detalle completo de una venta específica,
**para** verificar ítems, precios y estado.

**CA:**
- CA1: Cabecera: número, fecha, cliente, vendedor, estado sync.
- CA2: Lista de ítems con detalle, cantidad, precio unitario, subtotal.
- CA3: Monto total.
- CA4: Botón "Reimprimir recibo".

**SP:** 3

---

## ÉPICA 7 — Módulo de Compras / Abastecimiento 🆕

### HU-COMP-01: Gestionar proveedores
**Como** administrador,
**quiero** mantener un catálogo de proveedores,
**para** asociarlos a las compras de inventario.

**CA:**
- CA1: CRUD completo: nombre (obligatorio), contacto, teléfono, dirección.
- CA2: Soft delete con opción de reactivar.
- CA3: Confirmación antes de desactivar.
- CA4: Tabla con filtro por nombre.

**SP:** 3

---

### HU-COMP-02: Registrar compra/abastecimiento
**Como** administrador,
**quiero** registrar una compra de inventario con productos, cantidades y costos,
**para** actualizar las existencias y llevar el registro de abastecimiento.

**CA:**
- CA1: Se selecciona un proveedor del catálogo O se ingresa nombre libre.
- CA2: Tabla de ítems editable: producto (selector), cantidad (> 0), costo unitario (> 0), subtotal calculado.
- CA3: Se pueden agregar múltiples productos en una misma compra.
- CA4: Monto total de la compra calculado en tiempo real.
- CA5: Campo de notas opcionales.
- CA6: Al confirmar: INSERT compras + INSERT compra_detalle + UPDATE existencias en transacción atómica.
- CA7: Confirmación antes de guardar; redirección al historial tras éxito.

**SP:** 8

---

### HU-COMP-03: Consultar historial de compras
**Como** administrador,
**quiero** consultar las compras por período,
**para** tener visibilidad del abastecimiento realizado.

**CA:**
- CA1: Mismos atajos de período (Hoy, Esta semana, Esta quincena, Este mes, Personalizado).
- CA2: Tabla: fecha, proveedor, monto, registrado por.
- CA3: Total del período visible al pie.
- CA4: Click en fila → panel/modal con detalle de ítems y costos.

**SP:** 3

---

## ÉPICA 8 — Módulo de Reportes (Web) 🆕

### HU-REP-01: Reporte de ventas por período
**Como** administrador,
**quiero** ver un reporte visual de ventas del período seleccionado,
**para** analizar el rendimiento del negocio.

**CA:**
- CA1: KPIs: total monto, cantidad de transacciones, ticket promedio.
- CA2: LineChart con ventas por día del período.
- CA3: Tabla por vendedor: username, monto, cantidad, ticket promedio.
- CA4: Tabla de transacciones paginada con todos los filtros del período.
- CA5: Mismos atajos de período en todos los reportes.

**SP:** 5

---

### HU-REP-02: Reporte de productos más vendidos
**Como** administrador,
**quiero** ver qué productos generan más ingresos,
**para** enfocar el abastecimiento en los más rentables.

**CA:**
- CA1: BarChart horizontal con top 10 por monto vendido.
- CA2: Tabla: posición, producto, cantidad total, monto total, % del total de ventas.
- CA3: Filtro de período.

**SP:** 3

---

### HU-REP-03: Reporte de movimiento de inventario
**Como** administrador,
**quiero** ver entradas y salidas por producto en un período,
**para** controlar el flujo del inventario.

**CA:**
- CA1: Tabla: producto, existencia actual, entradas (compras), salidas (ventas), balance neto.
- CA2: Balance negativo resaltado en rojo.
- CA3: Filtro por nombre de producto.

**SP:** 3

---

### HU-REP-04: Reporte de rentabilidad estimada
**Como** administrador,
**quiero** comparar el precio de venta vs el costo de compra por producto,
**para** estimar el margen de ganancia.

**CA:**
- CA1: Tabla ordenable: producto, ingresos, costos, margen $, margen %.
- CA2: Color del margen: verde > 30%, amarillo 10-30%, rojo < 10%.
- CA3: KPI global de margen promedio del período.
- CA4: Filtro de período.

**SP:** 5

---

### HU-REP-05: Reporte de compras por período
**Como** administrador,
**quiero** ver el total comprado por período con desglose por proveedor,
**para** controlar el gasto de abastecimiento.

**CA:**
- CA1: LineChart: monto comprado por día.
- CA2: Tabla: proveedor, monto total, cantidad de órdenes.
- CA3: KPI total comprado en el período.

**SP:** 3

---

## ÉPICA 9 — Panel Web General

### HU-WEB-01: Dashboard ejecutivo
**Como** administrador,
**quiero** ver un resumen visual al entrar al panel web,
**para** tener visibilidad rápida del estado del negocio.

**CA:**
- CA1: Tarjetas KPI: ventas hoy (monto + cantidad), delta % vs ayer (↑ verde / ↓ rojo).
- CA2: KPI ventas y compras de la semana.
- CA3: BarChart ventas por día de la semana.
- CA4: Alerta de productos con stock ≤ 5.
- CA5: Top 5 productos del día.

**SP:** 5

---

### HU-WEB-02: Vista de existencias con código de color
**Como** administrador,
**quiero** ver las existencias actuales con indicadores visuales de alerta,
**para** saber cuándo reponer inventario rápidamente.

**CA:**
- CA1: Tabla: productos activos + existencia actual.
- CA2: Rojo si existencia ≤ 5; amarillo si ≤ 15; verde si > 15.
- CA3: Botón de ingreso de existencia accesible por fila.
- CA4: Exportar lista a CSV generado en el cliente.

**SP:** 3

---

### HU-WEB-03: Gestión de usuarios
**Como** administrador,
**quiero** gestionar los usuarios del sistema desde el panel web,
**para** controlar quién accede y con qué rol.

**CA:**
- CA1: Crear: username, password, nombre completo, rol.
- CA2: Editar: nombre y rol.
- CA3: Cambio de contraseña en formulario separado (mínimo 6 caracteres).
- CA4: Desactivar/reactivar (soft delete).
- CA5: No puede desactivar su propio usuario.

**SP:** 5

---

## Resumen de Estimaciones v2

| Épica | Historias | SP |
|---|---|---|
| Autenticación | 3 | 6 |
| Offline / Sincronización 🆕 | 3 | 19 |
| Impresión Térmica 🆕 | 2 | 7 |
| Gestión de Productos | 4 | 9 |
| Ventas (App) | 4 | 16 |
| Consulta de Ventas (App) | 2 | 8 |
| Compras / Abastecimiento 🆕 | 3 | 14 |
| Reportes (Web) 🆕 | 5 | 19 |
| Panel Web General | 3 | 13 |
| **TOTAL** | **29** | **111** |
