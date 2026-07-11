import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useCreateCompra } from '@/hooks/useCompras'
import { useProductos } from '@/hooks/useProductos'
import { useProveedores } from '@/hooks/useProveedores'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const compraSchema = z.object({
  proveedor_id: z.number().optional().nullable(),
  proveedor_nombre: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        producto_id: z.number({ message: 'Seleccioná un producto' }).positive('Seleccioná un producto'),
        cantidad: z.number({ message: 'Ingresá la cantidad' }).positive('Debe ser mayor a 0'),
        costo_unitario: z.number({ message: 'Ingresá el costo' }).min(0, 'Debe ser 0 o mayor'),
      }),
    )
    .min(1, 'Agregá al menos un ítem'),
})

type CompraFormValues = z.infer<typeof compraSchema>

const fmt = (n: number) => `$${n.toFixed(2)}`

export default function NuevaCompraPage() {
  const navigate = useNavigate()
  const createCompra = useCreateCompra()
  const { data: productos } = useProductos()
  const { data: proveedores } = useProveedores()
  const sucursalId = useAuthStore((s) => s.sucursalActiva)

  const [proveedorMode, setProveedorMode] = useState<'registrado' | 'libre'>('registrado')

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompraFormValues>({
    resolver: zodResolver(compraSchema),
    defaultValues: {
      proveedor_id: null,
      proveedor_nombre: null,
      notas: null,
      items: [{ producto_id: 0, cantidad: 1, costo_unitario: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const itemsWatched = watch('items')
  const total = itemsWatched?.reduce((sum, item) => {
    const q = Number(item.cantidad) || 0
    const c = Number(item.costo_unitario) || 0
    return sum + q * c
  }, 0) ?? 0

  // Guard: if no branch selected, show a message and prevent form submission
  if (sucursalId === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/compras')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Nueva compra</h1>
        </div>
        <p className="text-muted-foreground">
          Selecciona una sucursal en el encabezado para registrar una compra.
        </p>
        <Button variant="outline" onClick={() => navigate('/compras')}>
          Volver a compras
        </Button>
      </div>
    )
  }

  const onSubmit = async (data: CompraFormValues) => {
    try {
      const body = {
        proveedor_id: proveedorMode === 'registrado' ? data.proveedor_id : null,
        proveedor_nombre:
          proveedorMode === 'libre'
            ? data.proveedor_nombre || null
            : proveedores?.find((p) => p.id === data.proveedor_id)?.nombre || null,
        notas: data.notas || null,
        // sucursal_id is injected by the useCreateCompra hook from the store
        items: data.items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario,
        })),
      }
      await createCompra.mutateAsync(body)
      toast.success('Compra registrada')
      navigate('/compras')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al registrar la compra')
    }
  }

  const activeProductos = productos?.filter((p) => p.activo) ?? []
  const activeProveedores = proveedores?.filter((p) => p.activo) ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/compras')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nueva compra</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Proveedor section */}
        <div className="rounded-md border p-4 space-y-3">
          <h2 className="font-semibold">Proveedor</h2>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setProveedorMode('registrado'); setValue('proveedor_nombre', null) }}
              className={`rounded px-3 py-1.5 text-sm font-medium border transition-colors ${
                proveedorMode === 'registrado'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Proveedor registrado
            </button>
            <button
              type="button"
              onClick={() => { setProveedorMode('libre'); setValue('proveedor_id', null) }}
              className={`rounded px-3 py-1.5 text-sm font-medium border transition-colors ${
                proveedorMode === 'libre'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Nombre libre
            </button>
          </div>

          {proveedorMode === 'registrado' ? (
            <div className="space-y-1">
              <Label htmlFor="proveedor_id">Proveedor</Label>
              <select
                id="proveedor_id"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('proveedor_id', { setValueAs: (v) => (v === '' || v == null) ? null : Number(v) })}
              >
                <option value="">Sin proveedor</option>
                {activeProveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="proveedor_nombre">Nombre del proveedor</Label>
              <Input
                id="proveedor_nombre"
                placeholder="Ej: Distribuidora Norte"
                {...register('proveedor_nombre')}
              />
            </div>
          )}
        </div>

        {/* Items section */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Ítems</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ producto_id: 0, cantidad: 1, costo_unitario: 0 })}
            >
              <Plus className="mr-1 h-3 w-3" />
              Agregar ítem
            </Button>
          </div>

          {errors.items?.root && (
            <p className="text-xs text-destructive">{errors.items.root.message}</p>
          )}
          {typeof errors.items?.message === 'string' && (
            <p className="text-xs text-destructive">{errors.items.message}</p>
          )}

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                <div className="space-y-1">
                  {index === 0 && <Label>Producto</Label>}
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    {...register(`items.${index}.producto_id`, { valueAsNumber: true })}
                  >
                    <option value={0}>Seleccioná un producto</option>
                    {activeProductos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.items?.[index]?.producto_id && (
                    <p className="text-xs text-destructive">
                      {errors.items[index].producto_id?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1 w-24">
                  {index === 0 && <Label>Cantidad</Label>}
                  <Input
                    type="number"
                    min={0.001}
                    step="any"
                    placeholder="Cant."
                    {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
                  />
                  {errors.items?.[index]?.cantidad && (
                    <p className="text-xs text-destructive">
                      {errors.items[index].cantidad?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1 w-28">
                  {index === 0 && <Label>Costo unit.</Label>}
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="$0.00"
                    {...register(`items.${index}.costo_unitario`, { valueAsNumber: true })}
                  />
                  {errors.items?.[index]?.costo_unitario && (
                    <p className="text-xs text-destructive">
                      {errors.items[index].costo_unitario?.message}
                    </p>
                  )}
                </div>

                <div className={index === 0 ? 'pt-6' : ''}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <textarea
            id="notas"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Observaciones sobre la compra..."
            {...register('notas')}
          />
        </div>

        {/* Summary + submit */}
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Total estimado</span>
          <span className="text-xl font-bold">{fmt(total)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/compras')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createCompra.isPending}>
            {createCompra.isPending ? 'Guardando...' : 'Registrar compra'}
          </Button>
        </div>
      </form>
    </div>
  )
}
