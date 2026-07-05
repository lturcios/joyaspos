import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginSchema, type LoginFormValues } from '@/lib/schemas'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard'

  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null)
    const result = await login(data.username, data.password)
    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setServerError(result.error ?? 'Error al iniciar sesión')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">JoyasPOS</h1>
        <p className="mb-6 text-sm text-muted-foreground">Ingresá tus credenciales para continuar</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="username"
            label="Usuario"
            autoComplete="username"
            error={errors.username}
            {...register('username')}
          />

          <FormField
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password}
            {...register('password')}
          />

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
