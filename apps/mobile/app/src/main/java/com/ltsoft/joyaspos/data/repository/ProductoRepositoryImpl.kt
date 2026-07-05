package com.ltsoft.joyaspos.data.repository

import android.util.Log
import com.ltsoft.joyaspos.data.local.dao.ProductoDao
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.domain.repository.ProductoRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductoRepositoryImpl @Inject constructor(
    private val productoDao: ProductoDao,
    private val apiService: ApiService,
) : ProductoRepository {

    companion object {
        private const val TAG = "ProductoRepository"
    }

    // Guard: auto-sync runs at most once per process lifetime (= per login session).
    // Singleton flag survives ViewModel recreation on navigation.
    @Volatile private var sincronizadoEstaSesion = false

    override fun resetSyncFlag() {
        sincronizadoEstaSesion = false
    }

    override fun getProductos(): Flow<List<ProductoEntity>> = productoDao.getTodos()

    override suspend fun syncProductos(force: Boolean): Boolean {
        if (!force && sincronizadoEstaSesion) {
            Log.d(TAG, "Productos ya sincronizados esta sesión, omitiendo.")
            return true
        }
        sincronizadoEstaSesion = true
        return try {
            val response = apiService.getProductos()
            if (response.isSuccessful) {
                val productos = response.body() ?: emptyList()
                val entities = productos.map { dto ->
                    ProductoEntity(
                        id = dto.id.toInt(),
                        nombre = dto.nombre,
                        unidadMedida = dto.unidad_medida,
                        existencia = dto.existencia,
                        activo = dto.activo,
                        ultimaSync = System.currentTimeMillis(),
                    )
                }
                productoDao.upsertAll(entities)
                Log.d(TAG, "Productos sincronizados: ${entities.size}")
                true
            } else {
                Log.w(TAG, "API rechazó getProductos: ${response.code()}")
                sincronizadoEstaSesion = false
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sin conexión al sincronizar productos: ${e.message}")
            sincronizadoEstaSesion = false
            false
        }
    }
}
