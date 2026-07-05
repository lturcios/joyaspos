import { Rol } from '../enums/roles'

export interface Usuario {
  id: number
  username: string
  nombre_completo: string
  rol: Rol
  activo: boolean
}

export interface CreateUsuarioRequest {
  username: string
  password: string
  nombre_completo: string
  rol: Rol
}

export interface UpdateUsuarioRequest {
  nombre_completo?: string
  rol?: Rol
  activo?: boolean
}

export interface ChangePasswordRequest {
  password: string  // mínimo 6 caracteres
}
