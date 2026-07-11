export interface Empresa {
  id: number
  nombre: string
  activo: boolean
}

export interface Sucursal {
  id: number
  empresa_id: number
  nombre: string
  direccion?: string | null
  telefono?: string | null
  activo: boolean
}

export interface CreateSucursalRequest {
  nombre: string
  direccion?: string
  telefono?: string
}

export type UpdateSucursalRequest = Partial<CreateSucursalRequest> & { activo?: boolean }
