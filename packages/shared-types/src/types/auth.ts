import { Rol } from '../enums/roles'

// DTO de request al login
export interface LoginRequest {
  username: string
  password: string
}

// Payload dentro del JWT
export interface JwtPayload {
  sub: number        // usuario id
  username: string
  rol: Rol
  iat?: number
  exp?: number
}

// Usuario devuelto tras login exitoso
export interface UserSession {
  id: number
  username: string
  nombre_completo: string
  rol: Rol
}

// Response completo del endpoint POST /auth/login
export interface LoginResponse {
  token: string
  user: UserSession
}
