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
  sucursal_id?: number  // required if rol === 'vendedor', validated in handler
}

export interface UpdateUsuarioRequest {
  nombre_completo?: string
  rol?: Rol
  activo?: boolean
}

export interface ChangePasswordRequest {
  password: string  // minimum 6 characters
}
