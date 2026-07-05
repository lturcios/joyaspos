package com.ltsoft.joyaspos.domain.repository

import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import kotlinx.coroutines.flow.Flow

interface ProductoRepository {
    fun getProductos(): Flow<List<ProductoEntity>>
    suspend fun syncProductos(force: Boolean = false): Boolean
    fun resetSyncFlag()
}
