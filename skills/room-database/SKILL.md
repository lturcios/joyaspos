---
name: room-database
description: |
  Implementa la base de datos local Room (SQLite) del app Android de JoyasPOS:
  entidades VentaEntity (con flag sincronizado y remoteId), VentaDetalleEntity,
  ProductoEntity (caché), DAOs con Flows reactivos, JoyasDatabase con versiones
  y migraciones seguras. Usar al crear las entidades Room por primera vez, al
  agregar campos a entidades existentes (requiere Migration versionada), al
  definir nuevas queries en un DAO, o al depurar problemas de persistencia local.
  REGLA CRÍTICA: nunca usar fallbackToDestructiveMigration() en producción.
  El campo sincronizado es el corazón del sistema offline-first — leer con atención
  las reglas de integridad antes de modificar cualquier entidad.
  Depende de SKILL-10 (android-project-structure).
---

> **⚠️ MULTITENANCY — LEER PRIMERO `skills/multitenancy-empresa-sucursal/SKILL.md`.**
> Esta skill fue escrita antes del requisito multiempresa/multisucursal. La skill
> de multitenancy define deltas OBLIGATORIOS que modifican el código de esta skill
> (campos `empresa_id`/`sucursal_id`, JWT extendido, scoping por sucursal en todos
> los queries, selector de sucursal, aislamiento de datos locales). Donde ambas
> se contradigan, gana la skill de multitenancy.


# SKILL-11 — Room Database (apps/mobile)

## Paquete base
`com.ltsoft.joyaspos.data.local`

---

## 1. Entidades

### `entity/VentaEntity.kt`
```kotlin
package com.ltsoft.joyaspos.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Representa una venta en la base de datos local Room.
 *
 * CAMPOS CRÍTICOS:
 * - sincronizado: false = pendiente de enviar a la API; true = ya registrado en MySQL.
 * - remoteId: null mientras sincronizado=false; ID de MySQL tras sync exitoso.
 *
 * REGLA: solo marcar sincronizado=true cuando la API retorna HTTP 201.
 */
@Entity(tableName = "ventas")
data class VentaEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    /** ID en MySQL. Null si aún no se ha sincronizado. */
    val remoteId: Long? = null,

    val nombreCliente: String = "Clientes Varios",
    val montoTotal: Double,

    /** Fecha y hora en formato ISO 8601: "2026-06-29T10:30:00.000Z" */
    val fechaHora: String,

    val usuarioId: Long,

    /**
     * Flag de sincronización.
     * false = pendiente de enviar a la API (por error de red o venta offline).
     * true  = ya registrada en MySQL y confirmada con HTTP 201.
     */
    val sincronizado: Boolean = false,
)
```

### `entity/VentaDetalleEntity.kt`
```kotlin
package com.ltsoft.joyaspos.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "venta_detalle",
    foreignKeys = [
        ForeignKey(
            entity = VentaEntity::class,
            parentColumns = ["id"],
            childColumns = ["ventaLocalId"],
            onDelete = ForeignKey.CASCADE,  // Si se borra la venta, se borran sus items
        )
    ],
    indices = [Index("ventaLocalId")]
)
data class VentaDetalleEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    /** FK a VentaEntity.id (ID local, no remote) */
    val ventaLocalId: Long,

    val productoId: Long,

    /**
     * Detalle concatenado: "{nombre_producto} {detalle_adicional}".trim()
     * Construido antes de insertar para mostrar en la UI y el recibo.
     */
    val detalle: String,

    /**
     * Cadena original ingresada por el usuario en el dialog "Agregar al carrito".
     * Se preserva por separado para enviar al servidor en POST /ventas y
     * /ventas/sync — el servidor reconstruye el `detalle` final para mantener
     * consistencia entre Room local y MySQL remoto.
     *
     * null si el usuario no ingresó nada adicional al nombre del producto.
     */
    val detalleAdicional: String? = null,

    val cantidad: Double,
    val precioUnitario: Double,
    val total: Double,
)
```

### `entity/ProductoEntity.kt`
```kotlin
package com.ltsoft.joyaspos.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Caché local de productos obtenidos de la API.
 * El id coincide con el id en MySQL (no autoGenerado — se asigna desde el servidor).
 * Se actualiza cada vez que el app conecta a la API mediante upsert (REPLACE).
 */
@Entity(tableName = "productos")
data class ProductoEntity(
    @PrimaryKey
    val id: Long,            // Mismo ID que en MySQL

    val nombre: String,
    val unidadMedida: String,
    val existencia: Double,
    val activo: Boolean,

    /** Timestamp Unix (ms) de la última sincronización con la API */
    val ultimaSync: Long = 0L,
)
```

---

## 2. DAOs

### `dao/VentaDao.kt`
```kotlin
package com.ltsoft.joyaspos.data.local.dao

import androidx.room.*
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VentaDao {

    // ── QUERIES ──────────────────────────────────────────────────────────────

    /**
     * Todas las ventas pendientes de sincronizar.
     * Usado por SyncWorker para saber qué enviar a la API.
     */
    @Query("SELECT * FROM ventas WHERE sincronizado = 0 ORDER BY fechaHora ASC")
    fun getPendientes(): Flow<List<VentaEntity>>

    /**
     * Versión suspending para uso en coroutines (SyncWorker).
     */
    @Query("SELECT * FROM ventas WHERE sincronizado = 0 ORDER BY fechaHora ASC")
    suspend fun getPendientesList(): List<VentaEntity>

    /**
     * Ventas en un rango de fechas (para la pantalla de consulta).
     * @param desde ISO 8601 (ej: "2026-06-29T00:00:00")
     * @param hasta ISO 8601 (ej: "2026-06-29T23:59:59")
     */
    @Query("""
        SELECT * FROM ventas
        WHERE fechaHora >= :desde AND fechaHora <= :hasta
        ORDER BY fechaHora DESC
    """)
    fun getPorPeriodo(desde: String, hasta: String): Flow<List<VentaEntity>>

    /** Conteo de ventas pendientes (para el badge del HomeScreen) */
    @Query("SELECT COUNT(*) FROM ventas WHERE sincronizado = 0")
    fun countPendientes(): Flow<Int>

    @Query("SELECT * FROM ventas WHERE id = :id")
    suspend fun getById(id: Long): VentaEntity?

    @Query("SELECT * FROM venta_detalle WHERE ventaLocalId = :ventaLocalId")
    suspend fun getDetallesByVentaId(ventaLocalId: Long): List<VentaDetalleEntity>

    // ── MUTACIONES ────────────────────────────────────────────────────────────

    /**
     * Insertar cabecera de venta. Retorna el ID local autogenerado.
     */
    @Insert
    suspend fun insertVenta(venta: VentaEntity): Long

    /**
     * Insertar items del detalle de una venta.
     */
    @Insert
    suspend fun insertDetalles(detalles: List<VentaDetalleEntity>)

    /**
     * Marcar una venta como sincronizada y asignar su ID remoto.
     * Llamado por el SyncWorker tras confirmación HTTP 201 de la API.
     */
    @Query("""
        UPDATE ventas
        SET sincronizado = 1, remoteId = :remoteId
        WHERE id = :localId
    """)
    suspend fun marcarSincronizado(localId: Long, remoteId: Long)

    /**
     * Actualización completa de una entidad (útil para casos edge).
     */
    @Update
    suspend fun update(venta: VentaEntity)
}
```

### `dao/ProductoDao.kt`
```kotlin
package com.ltsoft.joyaspos.data.local.dao

import androidx.room.*
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductoDao {

    /**
     * Todos los productos activos ordenados alfabéticamente.
     * Emite automáticamente cuando Room detecta cambios (offline-first).
     */
    @Query("SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC")
    fun getTodos(): Flow<List<ProductoEntity>>

    @Query("SELECT * FROM productos WHERE id = :id")
    suspend fun getById(id: Long): ProductoEntity?

    /**
     * Actualiza el caché de productos desde la API.
     * REPLACE: si el producto ya existe, lo sobreescribe; si no, lo inserta.
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(productos: List<ProductoEntity>)

    /**
     * Descuenta existencia localmente (optimistic update al agregar al carrito).
     * La existencia real se recalcula en la próxima sync de productos.
     */
    @Query("""
        UPDATE productos
        SET existencia = existencia - :cantidad
        WHERE id = :productoId
    """)
    suspend fun decrementarExistencia(productoId: Long, cantidad: Double)
}
```

---

## 3. JoyasDatabase

> **Requisito de Gradle:** `exportSchema = true` requiere configurar
> `room.schemaLocation` en `kapt` (ya está en SKILL-10, sección 4). Los archivos
> JSON del schema se generan en `app/schemas/` y deben commitearse al repo
> para auditoría histórica de migraciones.

### `JoyasDatabase.kt`
```kotlin
package com.ltsoft.joyaspos.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.ltsoft.joyaspos.data.local.dao.ProductoDao
import com.ltsoft.joyaspos.data.local.dao.VentaDao
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity

@Database(
    entities = [
        VentaEntity::class,
        VentaDetalleEntity::class,
        ProductoEntity::class,
    ],
    version = 1,             // Incrementar al cambiar el schema (ver sección 4)
    exportSchema = true,     // true en producción — genera JSON del schema para auditoría
)
abstract class JoyasDatabase : RoomDatabase() {
    abstract fun ventaDao(): VentaDao
    abstract fun productoDao(): ProductoDao

    companion object {
        const val DATABASE_NAME = "joyas_pos.db"

        /**
         * Migraciones — agregar aquí cada vez que se incremente la versión.
         * NUNCA usar fallbackToDestructiveMigration() en producción.
         *
         * Ejemplo de migración de versión 1 → 2:
         */
        // val MIGRATION_1_2 = object : Migration(1, 2) {
        //     override fun migrate(db: SupportSQLiteDatabase) {
        //         db.execSQL("ALTER TABLE ventas ADD COLUMN notas TEXT")
        //     }
        // }
    }
}
```

---

## 4. Módulo Hilt para Room

### `di/DatabaseModule.kt`
```kotlin
package com.ltsoft.joyaspos.di

import android.content.Context
import androidx.room.Room
import com.ltsoft.joyaspos.data.local.JoyasDatabase
import com.ltsoft.joyaspos.data.local.dao.ProductoDao
import com.ltsoft.joyaspos.data.local.dao.VentaDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): JoyasDatabase {
        return Room.databaseBuilder(
            context,
            JoyasDatabase::class.java,
            JoyasDatabase.DATABASE_NAME,
        )
        // ⛔ NUNCA usar esto en producción — destruye todos los datos del usuario
        // .fallbackToDestructiveMigration()
        // Agregar migraciones así cuando se incremente la versión:
        // .addMigrations(JoyasDatabase.MIGRATION_1_2)
        .build()
    }

    @Provides
    fun provideVentaDao(db: JoyasDatabase): VentaDao = db.ventaDao()

    @Provides
    fun provideProductoDao(db: JoyasDatabase): ProductoDao = db.productoDao()
}
```

---

## 5. Cómo agregar un campo nuevo a una entidad (migración)

**Escenario:** se necesita agregar el campo `notas: String?` a `VentaEntity`.

**Paso 1:** Modificar la entidad:
```kotlin
@Entity(tableName = "ventas")
data class VentaEntity(
    // ... campos existentes ...
    val notas: String? = null,   // nuevo campo con default null
)
```

**Paso 2:** Incrementar la versión en `JoyasDatabase`:
```kotlin
@Database(
    entities = [...],
    version = 2,   // era 1
    exportSchema = true,
)
```

**Paso 3:** Crear la migración:
```kotlin
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE ventas ADD COLUMN notas TEXT")
    }
}
```

**Paso 4:** Registrar la migración en `DatabaseModule`:
```kotlin
Room.databaseBuilder(context, JoyasDatabase::class.java, JoyasDatabase.DATABASE_NAME)
    .addMigrations(JoyasDatabase.MIGRATION_1_2)
    .build()
```

---

## 6. Reglas de integridad del flag `sincronizado`

Estas reglas deben respetarse en TODOS los lugares del código:

| Situación | `sincronizado` | `remoteId` |
|---|---|---|
| Venta recién creada (INSERT) | `false` | `null` |
| API retorna HTTP 201 (éxito) | `true` | `id` de MySQL |
| API retorna error / sin red | `false` | `null` |
| SyncWorker: sync exitoso | `true` | `id` de MySQL |
| SyncWorker: sync fallido | `false` (sin cambio) | `null` (sin cambio) |

**Nunca:**
- Marcar `sincronizado = true` si la API no retornó 201
- Asignar `remoteId` si `sincronizado` sigue siendo `false`
- Eliminar físicamente una `VentaEntity` — son registros permanentes

---

## 7. Consulta de ventas pendientes (uso típico en UI)

```kotlin
// En el ViewModel del HomeScreen
val countPendientes: StateFlow<Int> = ventaDao
    .countPendientes()
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

// En el Composable
val pendientes by viewModel.countPendientes.collectAsStateWithLifecycle()

if (pendientes > 0) {
    Banner(text = "$pendientes venta(s) pendiente(s) de sincronizar")
}
```
