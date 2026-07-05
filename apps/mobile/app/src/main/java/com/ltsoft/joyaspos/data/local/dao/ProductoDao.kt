package com.ltsoft.joyaspos.data.local.dao

import androidx.room.*
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductoDao {

    @Query("SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC")
    fun getTodos(): Flow<List<ProductoEntity>>

    @Query("SELECT * FROM productos WHERE id = :id")
    suspend fun getById(id: Long): ProductoEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(productos: List<ProductoEntity>)

    @Query("""
        UPDATE productos
        SET existencia = existencia - :cantidad
        WHERE id = :productoId
    """)
    suspend fun decrementarExistencia(productoId: Long, cantidad: Double)
}
