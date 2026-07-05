---
name: react-project-structure
description: |
  Scaffolding completo del panel web de JoyasPOS: React 18 + TypeScript + Vite +
  shadcn/ui + Tailwind CSS + TanStack Query + Zustand + React Router v6.
  Usar al inicializar apps/web desde cero, al agregar una nueva página o sección
  (compras, reportes, usuarios), al configurar path aliases, plugins de Vite, o
  la integración inicial de shadcn/ui. También usar como referencia de la
  estructura de carpetas y convenciones de nombres cuando haya dudas sobre dónde
  ubicar un componente, hook, store o tipo nuevo.
  Depende de SKILL-01 (monorepo-setup) y de SKILL-00D (design-system) — leer
  design-system PRIMERO porque define src/index.css y tailwind.config.ts; sin
  esos archivos exactos, los componentes de shadcn/ui no tienen color.
  Complementar con SKILL-22 (router/auth-guards), SKILL-23 (tanstack-query-axios),
  SKILL-24 (react-hook-form-zod) y SKILL-30 (zustand).
---

# SKILL-21 — React Project Structure (apps/web)

## Stack
React 18 + TypeScript 5 + Vite · shadcn/ui + Tailwind CSS v3 · Zustand
TanStack Query v5 · TanStack Table v8 · React Router v6 · React Hook Form + Zod
Recharts · Axios · date-fns · pnpm

---

## 1. Estructura de carpetas completa

```
apps/web/
├── src/
│   ├── main.tsx                  # Entry point React
│   ├── App.tsx                   # Router + QueryClientProvider + providers
│   │
│   ├── pages/                    # Una carpeta por ruta principal
│   │   ├── login/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── ventas/
│   │   │   ├── VentasPage.tsx         # Listado + filtros
│   │   │   └── VentaDetailSheet.tsx   # Panel lateral con detalle
│   │   ├── productos/
│   │   │   ├── ProductosPage.tsx
│   │   │   ├── ProductoFormDialog.tsx
│   │   │   └── IngresoExistenciaDialog.tsx
│   │   ├── compras/
│   │   │   ├── ComprasPage.tsx        # Historial
│   │   │   ├── NuevaCompraPage.tsx    # Formulario nueva compra
│   │   │   └── CompraDetailSheet.tsx
│   │   ├── proveedores/
│   │   │   ├── ProveedoresPage.tsx
│   │   │   └── ProveedorFormDialog.tsx
│   │   ├── reportes/
│   │   │   ├── ReportesLayout.tsx     # Layout con nav lateral de reportes
│   │   │   ├── ventas/
│   │   │   │   └── ReporteVentasPage.tsx
│   │   │   ├── productos-top/
│   │   │   │   └── ReporteProductosTopPage.tsx
│   │   │   ├── inventario/
│   │   │   │   └── ReporteInventarioPage.tsx
│   │   │   ├── rentabilidad/
│   │   │   │   └── ReporteRentabilidadPage.tsx
│   │   │   └── compras/
│   │   │       └── ReporteComprasPage.tsx
│   │   ├── existencias/
│   │   │   └── ExistenciasPage.tsx
│   │   └── usuarios/
│   │       ├── UsuariosPage.tsx
│   │       └── UsuarioFormDialog.tsx
│   │
│   ├── components/               # Componentes reutilizables
│   │   ├── ui/                   # Componentes shadcn/ui (auto-generados, NO editar)
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx     # Shell con sidebar + header
│   │   │   ├── Sidebar.tsx       # Navegación lateral
│   │   │   └── Header.tsx        # Topbar con usuario y logout
│   │   ├── shared/
│   │   │   ├── KpiCard.tsx       # Tarjeta KPI con delta %
│   │   │   ├── PeriodFilter.tsx  # Selector de período reutilizable
│   │   │   ├── DataTable.tsx     # Wrapper de TanStack Table
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ErrorState.tsx
│   │   └── charts/
│   │       ├── LineChartCard.tsx
│   │       ├── BarChartCard.tsx
│   │       └── chartColors.ts    # Paleta de colores de gráficas
│   │
│   ├── hooks/                    # Custom hooks — TanStack Query
│   │   ├── useAuth.ts
│   │   ├── useProductos.ts
│   │   ├── useVentas.ts
│   │   ├── useCompras.ts
│   │   ├── useProveedores.ts
│   │   ├── useReportes.ts
│   │   └── useUsuarios.ts
│   │
│   ├── stores/                   # Zustand stores
│   │   └── authStore.ts          # JWT, user, isAuthenticated
│   │
│   ├── lib/                      # Utilidades y configuración
│   │   ├── axios.ts              # Instancia Axios con interceptores
│   │   ├── queryClient.ts        # QueryClient de TanStack Query
│   │   ├── utils.ts              # cn(), formatCurrency(), formatDate()
│   │   └── periodos.ts           # Lógica de cálculo de fechas por atajo
│   │
│   ├── router/
│   │   ├── index.tsx             # Definición de todas las rutas
│   │   ├── PrivateRoute.tsx      # Redirige a /login si no autenticado
│   │   └── AdminRoute.tsx        # Redirige si rol !== admin
│   │
│   └── types/                    # Re-exports de @joyaspos/shared-types
│       └── index.ts
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json               # Configuración shadcn/ui — ver SKILL-00D
├── .env                          # VITE_API_URL (no commitear)
├── .env.example
└── package.json
```

> **`src/index.css` no aparece en este árbol por error de copiado — SÍ existe**
> y es un archivo crítico. Su contenido completo está definido en
> **SKILL-00D (design-system)**, sección 2. Sin este archivo, los componentes
> de shadcn/ui (Button, Card, Input...) se renderizan sin color porque las
> clases Tailwind como `bg-primary` dependen de variables CSS que deben
> existir en `:root`. **Crearlo es el primer paso de esta skill, antes que
> cualquier otro archivo.**

---

## 2. Instalación de dependencias

```bash
# React + Vite + TypeScript (ya creado al hacer pnpm create vite)
# Si se crea desde cero:
cd apps/web
pnpm create vite . --template react-ts

# UI y estilos
pnpm add -D tailwindcss postcss autoprefixer tailwindcss-animate
pnpm dlx tailwindcss init -p

# shadcn/ui — NO ejecutar "init" (es interactivo y falla silenciosamente
# en entornos no interactivos como Claude Code). En su lugar:
#   1. Crear components.json manualmente (contenido en SKILL-00D sección 4)
#   2. Crear src/index.css manualmente (contenido en SKILL-00D sección 2)
#   3. Crear tailwind.config.ts manualmente (contenido en SKILL-00D sección 3)
#   4. Instalar class-variance-authority, clsx, tailwind-merge, lucide-react
pnpm add class-variance-authority clsx tailwind-merge lucide-react
# Recién después de los 3 archivos de configuración, instalar componentes
# individuales con "add" (ver sección 7 de esta skill) — "add" SÍ funciona
# sin prompts cuando components.json ya existe.

# Router y navegación
pnpm add react-router-dom

# Estado y datos
pnpm add @tanstack/react-query @tanstack/react-table
pnpm add zustand
pnpm add axios

# Formularios
pnpm add react-hook-form @hookform/resolvers zod

# Gráficas y fechas
pnpm add recharts date-fns

# Tipos compartidos
pnpm add @joyaspos/shared-types

# Iconos (lucide ya viene con shadcn/ui)
pnpm add lucide-react
```

---

## 3. Archivos de configuración

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `src/index.css` — CRÍTICO, crear antes que nada más

> Contenido completo en **SKILL-00D (design-system)**, sección 2. Este archivo
> define la paleta de marca de JoyasPOS (dorado antiguo + carbón cálido +
> marfil) como variables CSS. **Sin este archivo, toda la UI se ve en blanco
> y negro** porque shadcn/ui depende de estas variables.

```bash
# Verificar que el archivo existe y NO está vacío antes de continuar
cat apps/web/src/index.css | head -5
# Debe mostrar el @import de Google Fonts y @tailwind base — si no, crearlo
# con el contenido exacto de SKILL-00D sección 2.
```

### `tailwind.config.ts`

> Contenido completo en **SKILL-00D (design-system)**, sección 3. La clave es
> que cada color esté envuelto en `hsl(var(--xxx))` apuntando a las variables
> definidas en `index.css` — de lo contrario las clases existen pero no
> resuelven a ningún valor visible.

### `.env.example`
```env
VITE_API_URL=http://localhost:3000
```

---

## 4. Archivos de bootstrap

### `src/main.tsx`
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { queryClient } from './lib/queryClient'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
)
```

### `src/App.tsx`
```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function App() {
  return <RouterProvider router={router} />
}
```

---

## 5. Utilidades en `src/lib/`

### `src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Helper de shadcn/ui para combinar clases Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatear moneda en USD (negocio en El Salvador)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

// Formatear fecha para mostrar en UI
export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: es })
}

// Delta % entre dos valores (ventas hoy vs ayer, etc.)
export function calcDeltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
```

### `src/lib/periodos.ts`
```typescript
import {
  startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth,
  setDate, getDaysInMonth, format
} from 'date-fns'
import { es } from 'date-fns/locale'

export interface RangoPeriodo {
  desde: string   // YYYY-MM-DD
  hasta: string   // YYYY-MM-DD
}

const fmt = (date: Date) => format(date, 'yyyy-MM-dd')

export function calcularPeriodo(atajo: string, custom?: { desde: string; hasta: string }): RangoPeriodo {
  const hoy = new Date()

  switch (atajo) {
    case 'hoy':
      return { desde: fmt(startOfDay(hoy)), hasta: fmt(endOfDay(hoy)) }

    case 'esta_semana':
      return {
        desde: fmt(startOfWeek(hoy, { weekStartsOn: 1, locale: es })),
        hasta: fmt(hoy),
      }

    case 'esta_quincena': {
      const dia = hoy.getDate()
      if (dia <= 15) {
        return {
          desde: fmt(setDate(hoy, 1)),
          hasta: fmt(setDate(hoy, 15)),
        }
      } else {
        return {
          desde: fmt(setDate(hoy, 16)),
          hasta: fmt(setDate(hoy, getDaysInMonth(hoy))),
        }
      }
    }

    case 'este_mes':
      return {
        desde: fmt(startOfMonth(hoy)),
        hasta: fmt(endOfMonth(hoy)),
      }

    case 'personalizado':
      return custom ?? { desde: fmt(startOfDay(hoy)), hasta: fmt(hoy) }

    default:
      return { desde: fmt(startOfDay(hoy)), hasta: fmt(hoy) }
  }
}
```

### `src/lib/queryClient.ts`
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,    // 2 minutos
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

---

## 6. `src/lib/axios.ts`

```typescript
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

// Interceptor de request — agrega JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de response — maneja 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## 7. shadcn/ui — componentes a instalar

Instalar los componentes necesarios del proyecto:

```bash
# Componentes base del layout y formularios
pnpm dlx shadcn-ui@latest add button input label card
pnpm dlx shadcn-ui@latest add dialog sheet
pnpm dlx shadcn-ui@latest add table
pnpm dlx shadcn-ui@latest add badge toast sonner
pnpm dlx shadcn-ui@latest add select command popover
pnpm dlx shadcn-ui@latest add calendar date-picker
pnpm dlx shadcn-ui@latest add alert alert-dialog
pnpm dlx shadcn-ui@latest add separator skeleton
pnpm dlx shadcn-ui@latest add dropdown-menu
pnpm dlx shadcn-ui@latest add sidebar
```

> Los componentes generados van en `src/components/ui/` — NO editarlos manualmente.

---

## 8. Convenciones de código

1. **Páginas** en `src/pages/` — un archivo por ruta; nombre `XxxPage.tsx`.
2. **Componentes reutilizables** en `src/components/shared/` — no dependen de datos de negocio.
3. **Componentes de UI base** en `src/components/ui/` — solo los de shadcn/ui.
4. **Hooks de TanStack Query** en `src/hooks/` — uno por módulo de negocio.
5. **Nunca hacer `fetch` ni `axios.get()` directamente en un componente o página** — siempre via hook en `src/hooks/`.
6. **Imports con alias `@/`** — nunca rutas relativas con `../../`.
7. **`tsc --noEmit` debe pasar** sin errores en todo momento.
8. **Formularios siempre con React Hook Form + Zod** — nunca `useState` para cada campo.

---

## 9. Verificación visual obligatoria

Antes de dar por terminada esta skill, levantar el dev server y confirmar
visualmente que la paleta de marca se aplicó:

```bash
pnpm --filter web dev
```

Abrir `http://localhost:5173` — aunque la página esté vacía de contenido,
el `<body>` debe tener fondo marfil (no blanco puro) y cualquier botón de
prueba debe verse dorado, no gris/transparente. Si se ve blanco y negro,
`src/index.css` no se está aplicando — revisar que `main.tsx` lo importe y
que el archivo tenga contenido real (no solo `@tailwind base;` sin las
variables CSS de SKILL-00D).

---

## 10. Siguiente paso

Con la estructura y el sistema de diseño listos:
- **SKILL-30** (`zustand-auth-store`) — Implementar el store de autenticación
- **SKILL-22** (`react-router-auth-guards`) — Configurar rutas, protección y layout responsivo
- **SKILL-23** (`tanstack-query-axios`) — Hooks de datos por módulo
- **SKILL-24** (`react-hook-form-zod`) — Formularios con validación
