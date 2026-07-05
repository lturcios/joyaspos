package com.ltsoft.joyaspos.data.remote

import com.ltsoft.joyaspos.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("productos")
    suspend fun getProductos(): Response<List<ProductoDto>>

    @POST("ventas")
    suspend fun createVenta(@Body request: CreateVentaRequest): Response<VentaResponse>

    @POST("ventas/sync")
    suspend fun syncVentas(@Body request: SyncVentasRequest): Response<SyncVentasResponse>

    @GET("ventas")
    suspend fun getVentas(
        @Query("desde") desde: String,
        @Query("hasta") hasta: String,
    ): Response<List<VentaResumenDto>>

    @GET("ventas/{id}")
    suspend fun getVentaById(@Path("id") id: Long): Response<VentaDetalleDto>
}
