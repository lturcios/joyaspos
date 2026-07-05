package com.ltsoft.joyaspos.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.ltsoft.joyaspos.data.local.dao.ProductoDao
import com.ltsoft.joyaspos.data.local.dao.VentaDao
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity

// Full migrations implemented in SKILL-11 (room-database)
@Database(
    entities = [VentaEntity::class, VentaDetalleEntity::class, ProductoEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class JoyasDatabase : RoomDatabase() {
    abstract fun ventaDao(): VentaDao
    abstract fun productoDao(): ProductoDao

    companion object {
        const val DATABASE_NAME = "joyas_database"
    }
}
