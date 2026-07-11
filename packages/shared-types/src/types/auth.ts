import { Rol } from '../enums/roles'
import type { Empresa, Sucursal } from '../entities/empresa'

// DTO de request al login
export interface LoginRequest {
  username: string
  password: string
}

// Payload dentro del JWT
export interface JwtPayload {
  sub: number          // usuario id
  username: string
  rol: Rol
  empresa_id: number
  sucursal_id: number | null  // null = admin sin sucursal fija
  iat?: number
  exp?: number
}

// Usuario devuelto tras login exitoso
export interface UserSession {
  id: number
  username: string
  nombre_completo: string
  rol: Rol
  empresa_id: number
  sucursal_id: number | null
  sucursal_nombre: string | null
}

// Response completo del endpoint POST /auth/login
export interface LoginResponse {
  token: string
  user: UserSession
  empresa: Empresa
  sucursales: Sucursal[]
}
