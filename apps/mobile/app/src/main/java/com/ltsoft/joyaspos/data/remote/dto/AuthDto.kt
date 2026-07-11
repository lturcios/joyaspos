package com.ltsoft.joyaspos.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(val username: String, val password: String)

@JsonClass(generateAdapter = true)
data class UserDto(
    val id: Long,
    val username: String,
    @Json(name = "nombre_completo") val nombreCompleto: String,
    val rol: String,
    @Json(name = "empresa_id") val empresaId: Long,
    @Json(name = "sucursal_id") val sucursalId: Long?,       // null = admin
    @Json(name = "sucursal_nombre") val sucursalNombre: String?,
)

@JsonClass(generateAdapter = true)
data class EmpresaDto(
    val id: Long,
    val nombre: String,
    val activo: Boolean,
)

@JsonClass(generateAdapter = true)
data class SucursalDto(
    val id: Long,
    @Json(name = "empresa_id") val empresaId: Long,
    val nombre: String,
    val direccion: String? = null,
    val telefono: String? = null,
    val activo: Boolean,
)

@JsonClass(generateAdapter = true)
data class LoginResponse(
    val token: String,
    val user: UserDto,
    val empresa: EmpresaDto,
    val sucursales: List<SucursalDto>,
)
