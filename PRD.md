# PRD — JoyasPOS
## Product Requirements Document
**Versión:** 2.0.0  
**Fecha:** 2026-06-28  
**Autor:** LTSOFT Ingeniería Informática  
**Estado:** Borrador v2 — MVP ampliado

---

## 1. Visión General del Producto

**JoyasPOS** es un sistema de punto de venta especializado para negocios de joyería, compuesto por tres componentes integrados en un monorepo:

| Componente | Descripción |
|---|---|
| **App Móvil (Android/Kotlin)** | Aplicación nativa para dispositivos Sunmi V2SE, con operación offline (Room) y sincronización automática |
| **API REST (Node.js)** | Backend centralizado con base de datos MySQL en VPS Oracle |
| **Panel Web (React)** | Dashboard administrativo completo: ventas, compras, reportes, usuarios y existencias |

### 1.1 Problema que Resuelve
Los vendedores de joyería en punto de venta necesitan:
- Registrar ventas rápidamente desde un dispositivo portátil Sunmi V2SE, **incluso sin conexión a internet**
- Manejar precios dinámicos por negociación o lote
- Imprimir recibos térmicos desde el Sunmi al concretar cada venta
- Que el sistema se sincronice automáticamente cuando la conexión se restablezca
- Registrar compras/abastecimiento de inventario de forma estructurada
- Que el dueño tenga reportes visuales atractivos y detallados desde el panel web

### 1.2 Objetivos de Negocio
1. Reducir el tiempo de registro de una venta a menos de 2 minutos
2. Eliminar registros en papel y garantizar cero pérdida de datos por fallas de red
3. Centralizar inventario, ventas y compras en un solo sistema
4. Proveer reportes ejecutivos que permitan tomar decisiones informadas
5. Automatizar la actualización de existencias tanto por ventas como por compras

---

## 2. Usuarios Objetivo

### 2.1 Personas

**Vendedor / Cajero**
- Opera el Sunmi V2SE en el mostrador o de forma ambulante
- Necesita interfaz simple, botones grandes, flujo lineal
- Requiere funcionamiento aunque la señal falle (modo offline)
- Imprime recibo al cliente tras cada venta

**Administrador / Dueño**
- Accede principalmente desde el panel web
- Gestiona productos, usuarios, existencias, compras y reportes
- Necesita visibilidad de rentabilidad, movimientos de inventario y tendencias de venta

---

## 3. Alcance del MVP (v2)

### 3.1 App Móvil — Nuevas funcionalidades
- [x] **Base de datos local Room** — persistencia offline de productos y ventas
- [x] **Campo `sincronizado` (flag BOOLEAN)** en tablas Room de ventas y compras
- [x] **WorkManager** — worker de reintento automático para sincronizar pendientes
- [x] **Impresión de recibo térmico** desde el SDK de impresión Sunmi al confirmar venta
- [x] Indicador visual de estado de sincronización en consulta de ventas

### 3.2 Panel Web — Nuevas funcionalidades
- [x] **Módulo de Compras/Abastecimiento** — registro de órdenes de compra, proveedores y recepción de mercancía
- [x] **Módulo de Reportes** — reportes visuales atractivos con gráficas, tablas y resúmenes exportables

### 3.3 API REST — Nuevas rutas
- [x] Endpoints de proveedores (CRUD)
- [x] Endpoints de compras (cabecera + detalle)
- [x] Endpoints de reportes agregados (ventas por período, productos más vendidos, movimientos de inventario, rentabilidad)
- [x] Endpoint de sincronización batch (recibe array de ventas pendientes de la app)

### 3.4 Excluido del MVP (fase 2+)
- Facturación electrónica DTE
- Múltiples sucursales
- Módulo de cuentas por pagar a proveedores
- Exportación de reportes a PDF/Excel

---

## 4. Stack Tecnológico

### 4.1 App Móvil — Kotlin (Android)
| Capa | Tecnología |
|---|---|
| Lenguaje | Kotlin |
| UI | Jetpack Compose |
| Arquitectura | MVVM + Clean Architecture + Repository Pattern |
| Inyección de dependencias | Hilt |
| Networking | Retrofit 2 + OkHttp3 |
| Serialización | Moshi |
| Navegación | Navigation Compose |
| Estado/reactivo | StateFlow + ViewModel |
| **Base de datos local** | **Room (SQLite)** |
| **Sincronización offline** | **WorkManager** |
| **Impresión** | **Sunmi Printer SDK (AIDL/JavaSDK)** |
| Almacenamiento local config | DataStore Preferences (tokens, sesión) |
| Build | Gradle (Kotlin DSL) |
| Target SDK | Android 9+ (API 28+) — compatible Sunmi V2SE |

### 4.2 API REST — Node.js
| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Fastify 4 |
| ORM | Prisma |
| Base de datos | MySQL 8 (VPS Oracle / Oracle Linux) |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| Validación | Zod |
| Gestor de paquetes | pnpm |
| Logging | Pino |
| Variables de entorno | dotenv |
| Dev | tsx, nodemon |

### 4.3 Panel Web — React
| Capa | Tecnología |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| Estado global | Zustand |
| Server state | TanStack Query v5 |
| Routing | React Router v6 |
| Formularios | React Hook Form + Zod |
| Tablas | TanStack Table v8 |
| **Gráficas/Reportes** | **Recharts + react-chartjs-2** |
| Fechas | date-fns |
| HTTP Client | Axios |
| Gestor de paquetes | pnpm |
| Build | Vite |

### 4.4 Monorepo
| Herramienta | Uso |
|---|---|
| pnpm workspaces | Gestión del monorepo |
| Turborepo | Orquestación de builds/tasks |
| ESLint + Prettier | Linting y formato (API y Web) |

---

## 5. Estructura del Monorepo

```
joyaspos/
├── apps/
│   ├── mobile/                    # Proyecto Android (Kotlin)
│   │   ├── data/
│   │   │   ├── local/             # Room DAOs, Entities, Database
│   │   │   │   ├── entity/        # VentaEntity, VentaDetalleEntity, ProductoEntity
│   │   │   │   ├── dao/           # VentaDao, ProductoDao
│   │   │   │   └── JoyasDatabase.kt
│   │   │   ├── remote/            # Retrofit services
│   │   │   └── repository/        # Implementaciones del Repository Pattern
│   │   ├── domain/                # Use cases, modelos de dominio
│   │   ├── presentation/          # ViewModels + Composables
│   │   └── worker/                # SyncWorker (WorkManager)
│   ├── api/                       # Fastify API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── productos/
│   │   │   │   ├── ventas/
│   │   │   │   ├── compras/       # NUEVO
│   │   │   │   ├── proveedores/   # NUEVO
│   │   │   │   ├── reportes/      # NUEVO
│   │   │   │   └── usuarios/
│   │   │   └── prisma/
│   └── web/                       # React dashboard
│       └── src/
│           ├── pages/
│           │   ├── dashboard/
│           │   ├── ventas/
│           │   ├── productos/
│           │   ├── compras/        # NUEVO
│           │   ├── reportes/       # NUEVO
│           │   ├── existencias/
│           │   └── usuarios/
│           └── components/
├── packages/
│   └── shared-types/              # Tipos TS compartidos (API ↔ Web)
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md
```

---

## 6. Modelo de Datos Completo

### 6.1 Tabla MySQL: `usuarios`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| username | VARCHAR(50) UNIQUE NOT NULL | |
| password_hash | VARCHAR(255) NOT NULL | Hash bcrypt |
| nombre_completo | VARCHAR(100) | |
| rol | ENUM('admin','vendedor') | |
| activo | TINYINT(1) DEFAULT 1 | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 6.2 Tabla MySQL: `productos`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| nombre | VARCHAR(150) NOT NULL | |
| unidad_medida | VARCHAR(30) NOT NULL | |
| existencia | DECIMAL(10,2) DEFAULT 0 | |
| activo | TINYINT(1) DEFAULT 1 | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 6.3 Tabla MySQL: `ventas`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| nombre_cliente | VARCHAR(100) DEFAULT 'Clientes Varios' | |
| monto_total | DECIMAL(10,2) NOT NULL | |
| fecha_hora | DATETIME NOT NULL | |
| usuario_id | INT FK → usuarios.id | |
| created_at | DATETIME | |

### 6.4 Tabla MySQL: `venta_detalle`
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| venta_id | INT FK → ventas.id | |
| producto_id | INT FK → productos.id | |
| detalle | VARCHAR(255) | nombre + cadena adicional |
| cantidad | DECIMAL(10,2) NOT NULL | |
| precio_unitario | DECIMAL(10,2) NOT NULL | |
| total | DECIMAL(10,2) NOT NULL | |

### 6.5 Tabla MySQL: `proveedores` *(NUEVO)*
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| nombre | VARCHAR(150) NOT NULL | |
| contacto | VARCHAR(100) | Nombre de contacto |
| telefono | VARCHAR(20) | |
| direccion | VARCHAR(255) | |
| activo | TINYINT(1) DEFAULT 1 | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 6.6 Tabla MySQL: `compras` (cabecera) *(NUEVO)*
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| proveedor_id | INT FK → proveedores.id | Nullable (compra sin proveedor registrado) |
| proveedor_nombre | VARCHAR(150) | Nombre libre si no está en catálogo |
| monto_total | DECIMAL(10,2) NOT NULL | |
| fecha_hora | DATETIME NOT NULL | |
| notas | TEXT | Observaciones opcionales |
| usuario_id | INT FK → usuarios.id | Admin que registró |
| created_at | DATETIME | |

### 6.7 Tabla MySQL: `compra_detalle` *(NUEVO)*
| Campo | Tipo | Descripción |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| compra_id | INT FK → compras.id | |
| producto_id | INT FK → productos.id | |
| cantidad | DECIMAL(10,2) NOT NULL | |
| costo_unitario | DECIMAL(10,2) NOT NULL | Precio de costo al momento |
| total | DECIMAL(10,2) NOT NULL | cantidad × costo_unitario |

### 6.8 Room Entities (App Móvil — SQLite local)

#### VentaEntity
| Campo | Tipo | Descripción |
|---|---|---|
| id | Long (autoGen) | PK local |
| remote_id | Long? | ID en MySQL (null si aún no sincronizado) |
| nombre_cliente | String | |
| monto_total | Double | |
| fecha_hora | String | ISO 8601 |
| usuario_id | Long | |
| **sincronizado** | **Boolean DEFAULT false** | **Flag de sincronización** |

#### VentaDetalleEntity
| Campo | Tipo | Descripción |
|---|---|---|
| id | Long (autoGen) | PK local |
| venta_local_id | Long | FK → VentaEntity.id |
| producto_id | Long | |
| detalle | String | |
| cantidad | Double | |
| precio_unitario | Double | |
| total | Double | |

#### ProductoEntity (caché local)
| Campo | Tipo | Descripción |
|---|---|---|
| id | Long | PK (igual al ID remoto) |
| nombre | String | |
| unidad_medida | String | |
| existencia | Double | |
| activo | Boolean | |
| ultima_sync | Long | Timestamp Unix de última actualización |

---

## 7. Arquitectura Offline-First (App Móvil)

```
┌─────────────────────────────────────────┐
│              Presentación               │
│         (Composables + ViewModels)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│            Repository Layer             │
│  VentaRepository / ProductoRepository   │
│                                         │
│  Estrategia: Local-first                │
│  1. Escribe en Room (inmediato)         │
│  2. Intenta sync con API                │
│  3. Si falla → queda sincronizado=false │
└──────┬──────────────────────────┬───────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  Room (DB   │          │  Retrofit (API  │
│  local)     │          │  remota)        │
└─────────────┘          └─────────────────┘
                                  ▲
┌─────────────────────────────────┴───────┐
│            SyncWorker                   │
│  (WorkManager — periódico + on connect) │
│  - Busca ventas con sincronizado=false  │
│  - POST /ventas/sync (batch)            │
│  - Al éxito: sincronizado=true,         │
│    remote_id asignado                   │
└─────────────────────────────────────────┘
```

---

## 8. Impresión de Recibo Térmico (Sunmi V2SE)

### 8.1 Contenido del Recibo
```
================================
        [NOMBRE NEGOCIO]
================================
Fecha: DD/MM/YYYY HH:MM
Venta #: [ID]
Cliente: [nombre_cliente]
Vendedor: [username]
--------------------------------
CANT  DESCRIPCIÓN        TOTAL
[x]   [detalle]         $[xxx]
...
--------------------------------
TOTAL:               $[monto]
================================
   Gracias por su compra
================================
```

### 8.2 Integración Sunmi
- SDK: `com.sunmi:printerlibrary` (AIDL)
- La impresión se dispara desde `SaleConfirmationScreen` tras registro exitoso (online u offline)
- Si la impresora no está lista (papel agotado, etc.): mostrar alerta con opción de reintentar
- El recibo se genera siempre, independientemente del estado de sincronización

---

## 9. Módulo de Compras/Abastecimiento (Panel Web)

### 9.1 Flujo de Registro de Compra
```
Compras → Nueva Compra
  → Seleccionar proveedor (o ingresar nombre libre)
  → Agregar productos comprados (producto, cantidad, costo unitario)
  → Ingresar notas opcionales
  → Confirmar compra
    → POST /compras
    → Existencias de productos se incrementan automáticamente
    → La compra queda registrada en historial
```

### 9.2 Gestión de Proveedores
- CRUD completo de proveedores (nombre, contacto, teléfono, dirección)
- Soft delete (activo = 0)
- Al registrar una compra puede elegirse un proveedor del catálogo O ingresar un nombre libre

---

## 10. Módulo de Reportes (Panel Web)

### 10.1 Reportes Disponibles

| Reporte | Descripción | Visualización |
|---|---|---|
| Ventas por período | Total vendido y cantidad de ventas en rango de fechas | Gráfica de líneas + tabla |
| Productos más vendidos | Top N productos por cantidad y monto | Gráfica de barras horizontales |
| Ventas por vendedor | Comparativa de rendimiento por usuario | Gráfica de barras agrupadas |
| Movimiento de inventario | Entradas (compras) vs Salidas (ventas) por producto | Tabla con barras inline |
| Resumen del día | KPIs del día actual vs ayer | Tarjetas con delta % |
| Compras por período | Total comprado, costo y proveedores | Gráfica de líneas + tabla |
| Rentabilidad estimada | Diferencia entre precio de venta y costo de compra por producto | Tabla ordenable |

### 10.2 Diseño Visual de Reportes
- Paleta consistente con el sistema de diseño (shadcn/ui + Tailwind)
- Gráficas con tooltips interactivos y leyendas
- Tablas con ordenamiento por columna y paginación
- Tarjetas de KPI con indicador de tendencia (↑ verde / ↓ rojo)
- Filtros de período con los mismos atajos: Hoy / Esta semana / Esta quincena / Este mes / Personalizado

---

## 11. Requerimientos No Funcionales

| Requerimiento | Detalle |
|---|---|
| Offline | La app debe registrar ventas sin conexión; sincronizar automáticamente al reconectar |
| Impresión | El recibo debe imprimirse en < 3 segundos tras confirmar la venta |
| Rendimiento | `GET /productos` < 500ms; reportes agregados < 2 segundos |
| Disponibilidad | API 99% uptime; app funcional 100% del tiempo (offline-first) |
| Seguridad | JWT 8h; bcrypt salt 12; HTTPS en producción |
| Usabilidad app | Botones ≥ 48dp; fuentes ≥ 14sp |
| Compatibilidad | Android 9+ (API 28); Node 20 LTS; últimas 2 versiones de navegadores modernos |
| Sync | WorkManager con backoff exponencial; máximo 5 reintentos por lote |

---

## 12. Criterios de Éxito del MVP v2

1. Una venta se puede registrar e imprimir recibo en menos de 2 minutos
2. Las ventas registradas offline se sincronizan automáticamente al recuperar conexión
3. Las compras actualizan las existencias en tiempo real
4. El panel de reportes muestra datos del día y tendencias semanales de forma visual
5. El administrador puede gestionar proveedores y registrar compras desde el panel web
6. El flag `sincronizado` refleja fielmente el estado de cada venta en la app
