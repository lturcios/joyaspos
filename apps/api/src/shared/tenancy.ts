import type { JwtPayload } from '@joyaspos/shared-types'

/**
 * Builds a Prisma `where` clause that scopes a query to the correct tenant.
 *
 * - If `sucursalId` is a concrete number: filter by that specific branch.
 * - If `sucursalId` is null (admin consolidated view): filter by all branches
 *   belonging to the admin's company.
 */
export function sucursalWhere(sucursalId: number | null, user: JwtPayload) {
  return sucursalId != null
    ? { sucursal_id: sucursalId }
    : { sucursal: { empresa_id: user.empresa_id } }
}
