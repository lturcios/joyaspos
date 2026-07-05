import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  usuarioSchema,
  editUsuarioSchema,
  changePasswordSchema,
  type UsuarioFormValues,
  type EditUsuarioFormValues,
  type ChangePasswordValues,
} from '@/lib/schemas'
import {
  useCreateUsuario,
  useUpdateUsuario,
  useChangePassword,
} from '@/hooks/useUsuarios'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Usuario } from '@joyaspos/shared-types'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit' | 'password'
  usuario?: Usuario
}

// ---- CREATE form ----
function CreateForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateUsuario()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UsuarioFormValues>({ resolver: zodResolver(usuarioSchema) })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: UsuarioFormValues) => {
    try {
      await createMutation.mutateAsync(data)
      toast.success('Usuario creado')
      handleClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al crear usuario')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="username">Username *</Label>
        <Input id="username" {...register('username')} />
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contraseña *</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="nombre_completo">Nombre completo *</Label>
        <Input id="nombre_completo" {...register('nombre_completo')} />
        {errors.nombre_completo && <p className="text-xs text-destructive">{errors.nombre_completo.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="rol">Rol *</Label>
        <select
          id="rol"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('rol')}
        >
          <option value="vendedor">Vendedor</option>
          <option value="admin">Admin</option>
        </select>
        {errors.rol && <p className="text-xs text-destructive">{errors.rol.message}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Guardando...' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  )
}

// ---- EDIT form ----
function EditForm({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const updateMutation = useUpdateUsuario()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditUsuarioFormValues>({
    resolver: zodResolver(editUsuarioSchema),
    defaultValues: {
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
      activo: usuario.activo,
    },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: EditUsuarioFormValues) => {
    try {
      await updateMutation.mutateAsync({ id: usuario.id, body: data })
      toast.success('Usuario actualizado')
      handleClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al actualizar usuario')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nombre_completo">Nombre completo *</Label>
        <Input id="nombre_completo" {...register('nombre_completo')} />
        {errors.nombre_completo && <p className="text-xs text-destructive">{errors.nombre_completo.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="rol">Rol *</Label>
        <select
          id="rol"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('rol')}
        >
          <option value="vendedor">Vendedor</option>
          <option value="admin">Admin</option>
        </select>
        {errors.rol && <p className="text-xs text-destructive">{errors.rol.message}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          id="activo"
          type="checkbox"
          className="h-4 w-4 rounded border"
          {...register('activo')}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleClose} disabled={updateMutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}

// ---- PASSWORD form ----
function PasswordForm({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const changePasswordMutation = useChangePassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data: ChangePasswordValues) => {
    try {
      await changePasswordMutation.mutateAsync({ id: usuario.id, body: { password: data.password } })
      toast.success('Contraseña actualizada')
      handleClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al cambiar la contraseña')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cambiando contraseña de <strong>{usuario.nombre_completo}</strong>
      </p>
      <div className="space-y-1">
        <Label htmlFor="password">Nueva contraseña *</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm">Confirmar contraseña *</Label>
        <Input id="confirm" type="password" {...register('confirm')} />
        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleClose} disabled={changePasswordMutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={changePasswordMutation.isPending}>
          {changePasswordMutation.isPending ? 'Guardando...' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}

// ---- Main dialog ----
export function UsuarioFormDialog({ open, onClose, mode, usuario }: Props) {
  const titles = {
    create: 'Nuevo usuario',
    edit: 'Editar usuario',
    password: 'Cambiar contraseña',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
        </DialogHeader>

        {mode === 'create' && <CreateForm onClose={onClose} />}
        {mode === 'edit' && usuario && <EditForm usuario={usuario} onClose={onClose} />}
        {mode === 'password' && usuario && <PasswordForm usuario={usuario} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
