---
name: zustand-auth-store
description: |
  Implementa el store de autenticación con Zustand para el panel web de JoyasPOS:
  estado { token, user, isAuthenticated }, acciones login/logout, persistencia en
  localStorage con zustand/middleware/persist, e integración con el interceptor
  de Axios para leer el token automáticamente. Usar al implementar la autenticación
  del panel web, al agregar datos del usuario al store, al depurar problemas de
  sesión persistida o al revisar cómo el AuthInterceptor accede al token sin
  hook de React. Es la fuente de verdad del estado de sesión en el panel web.
  Depende de SKILL-21 (react-project-structure). La instancia Axios que lo consume
  está definida en SKILL-23 (tanstack-query-axios).
---

> **⚠️ MULTITENANCY — LEER PRIMERO `skills/multitenancy-empresa-sucursal/SKILL.md`.**
> Esta skill fue escrita antes del requisito multiempresa/multisucursal. La skill
> de multitenancy define deltas OBLIGATORIOS que modifican el código de esta skill
> (campos `empresa_id`/`sucursal_id`, JWT extendido, scoping por sucursal en todos
> los queries, selector de sucursal, aislamiento de datos locales). Donde ambas
> se contradigan, gana la skill de multitenancy.


# SKILL-30 — Zustand Auth Store (apps/web)

## Principio
El store de auth es el único lugar donde vive el estado de sesión del panel web.
Axios lo lee fuera del árbol de React. Los guards lo leen en componentes React.

---

## 1. Definición del store

### `src/stores/authStore.ts`
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/axios'
import type { LoginResponse, UserSession } from '@joyaspos/shared-types'

interface AuthState {
  // ── Estado ──────────────────────────────────────────────────────────────────
  token: string | null
  user: UserSession | null
  isAuthenticated: boolean

  // ── Acciones ─────────────────────────────────────────────────────────────────
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  setSession: (token: string, user: UserSession) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      token: null,
      user: null,
      isAuthenticated: false,

      /**
       * login — llama a la API y guarda el token si es exitoso.
       * @returns { success: true } o { success: false, error: string }
       */
      login: async (username, password) => {
        try {
          const { data } = await api.post<LoginResponse>('/auth/login', {
            username,
            password,
          })

          set({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
          })

          return { success: true }
        } catch (err: any) {
          const message =
            err.response?.data?.message ??
            err.message ??
            'Error de conexión'
          return { success: false, error: message }
        }
      },

      /**
       * logout — limpia el estado y el localStorage.
       * El interceptor de Axios redirige al /login cuando recibe 401.
       */
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        // Limpiar cache de TanStack Query al hacer logout
        // (importar queryClient y llamar queryClient.clear() si se desea)
      },

      /**
       * setSession — para actualizar el token si se implementa refresh en el futuro.
       */
      setSession: (token, user) => {
        set({ token, user, isAuthenticated: true })
      },
    }),
    {
      name: 'joyas-auth',               // Clave en localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({         // Solo persistir lo necesario
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
```

---

## 2. Acceso al token fuera de React (para Axios)

El interceptor de Axios necesita el token sin usar hooks:

```typescript
// En src/lib/axios.ts — interceptor de request
api.interceptors.request.use((config) => {
  // getState() es el acceso al store fuera de componentes React
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de response — manejo de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Llamar logout del store directamente (sin hook)
      useAuthStore.getState().logout()
      // Redirigir al login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

> **`useAuthStore.getState()`** es el acceso síncrono al store de Zustand fuera
> del árbol de React. Es el patrón oficial de Zustand para este caso.

---

## 3. Uso en componentes React

```tsx
// Leer estado
const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
const user = useAuthStore((s) => s.user)
const token = useAuthStore((s) => s.token)

// Acciones
const login = useAuthStore((s) => s.login)
const logout = useAuthStore((s) => s.logout)

// Ejemplo — botón de logout en el sidebar
<button onClick={logout}>Cerrar sesión</button>

// Ejemplo — mostrar nombre del usuario
<span>{user?.nombre_completo}</span>

// Ejemplo — verificar rol
const isAdmin = user?.rol === 'admin'
```

---

## 4. Integración con TanStack Query al hacer logout

Para limpiar el caché de queries al cerrar sesión:

```typescript
// src/stores/authStore.ts — actualizar la acción logout
import { queryClient } from '@/lib/queryClient'

logout: () => {
  set({ token: null, user: null, isAuthenticated: false })
  queryClient.clear()  // Limpiar todos los datos cacheados
},
```

---

## 5. Datos disponibles en `user`

```typescript
// Tipo UserSession de @joyaspos/shared-types
interface UserSession {
  id: number
  username: string
  nombre_completo: string
  rol: 'admin' | 'vendedor'
}
```

---

## 6. Reglas

1. **`persist` con `partialize`** — solo persistir `token`, `user` e `isAuthenticated`; nunca callbacks ni funciones.
2. **La clave `'joyas-auth'`** no cambiar en producción — cambiarlo desloguea a todos.
3. **`getState()` para Axios** — los interceptores no son componentes React; usar `getState()` es el patrón correcto.
4. **`queryClient.clear()`** en logout — sin esto, datos de un usuario quedan visibles para el siguiente que inicie sesión en el mismo navegador.
5. **No almacenar la contraseña** — el store solo guarda el JWT y datos públicos del usuario.
6. **Un selector por dato** en los componentes — `useAuthStore((s) => s.token)` en lugar de `useAuthStore()` completo; evita re-renders innecesarios.
