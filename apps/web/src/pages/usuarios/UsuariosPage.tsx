import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useUsuarios, useDesactivarUsuario } from '@/hooks/useUsuarios'
import { UsuarioFormDialog } from './UsuarioFormDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Usuario } from '@joyaspos/shared-types'

type DialogMode = 'create' | 'edit' | 'password'

interface DialogState {
  open: boolean
  selectedUser: Usuario | undefined
  mode: DialogMode
}

export default function UsuariosPage() {
  const { data: usuarios, isLoading, isError, refetch } = useUsuarios()
  const desactivarMutation = useDesactivarUsuario()

  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    selectedUser: undefined,
    mode: 'create',
  })

  const openDialog = (mode: DialogMode, user?: Usuario) => {
    setDialog({ open: true, selectedUser: user, mode })
  }

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, open: false }))
  }

  const handleDesactivar = async (usuario: Usuario) => {
    try {
      await desactivarMutation.mutateAsync(usuario.id)
      toast.success('Usuario desactivado')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al desactivar')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message="Error al cargar usuarios" onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button onClick={() => openDialog('create')}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {!usuarios?.length ? (
        <EmptyState message="No hay usuarios registrados" />
      ) : (
        <>
          {/* Tabla — md+ */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Nombre completo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-mono text-sm">{usuario.username}</TableCell>
                    <TableCell className="font-medium">{usuario.nombre_completo}</TableCell>
                    <TableCell>
                      <Badge variant={usuario.rol === 'admin' ? 'default' : 'secondary'}>
                        {usuario.rol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialog('edit', usuario)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDialog('password', usuario)}>
                            Cambiar contraseña
                          </DropdownMenuItem>
                          {usuario.activo && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDesactivar(usuario)}
                            >
                              Desactivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — < md */}
          <div className="md:hidden space-y-2">
            {usuarios.map((usuario) => (
              <div key={usuario.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{usuario.nombre_completo}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                      @{usuario.username}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog('edit', usuario)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDialog('password', usuario)}>
                        Cambiar contraseña
                      </DropdownMenuItem>
                      {usuario.activo && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDesactivar(usuario)}
                        >
                          Desactivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={usuario.rol === 'admin' ? 'default' : 'secondary'}>
                    {usuario.rol}
                  </Badge>
                  <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                    {usuario.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <UsuarioFormDialog
        open={dialog.open}
        onClose={closeDialog}
        mode={dialog.mode}
        usuario={dialog.selectedUser}
      />
    </div>
  )
}
