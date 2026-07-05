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
)

@JsonClass(generateAdapter = true)
data class LoginResponse(val token: String, val user: UserDto)
