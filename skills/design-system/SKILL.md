---
name: design-system
description: |
  Sistema de diseño e identidad de marca de JoyasPOS: paleta de colores (dorado
  antiguo + carbón cálido + crema, apropiada para una boutique de joyería —
  NO azul corporativo genérico), tipografía (Playfair Display para títulos,
  Inter para cuerpo), y los archivos exactos que materializan esta identidad
  en cada plataforma: src/index.css (variables CSS de shadcn/ui) para el panel
  web, y Theme.kt para la app Android.
  USAR ESTA SKILL SIEMPRE antes de SKILL-21 (react-project-structure) y
  SKILL-16 (compose-ui-sunmi) — es la fuente única de verdad de colores y
  tipografía; ambas plataformas deben verse como la misma marca.
  CRÍTICO: sin el archivo src/index.css de esta skill, los componentes de
  shadcn/ui (Button, Card, Input...) NO TIENEN COLOR — el panel web se ve
  completamente blanco y negro porque las clases Tailwind como bg-primary
  dependen de variables CSS que deben existir en :root.
---

# SKILL-00D — Design System / Identidad de Marca (todo el proyecto)

## Por qué existe esta skill

`shadcn/ui` no trae colores "de fábrica". Sus componentes usan clases Tailwind
como `bg-primary`, `text-foreground`, `border-input` que internamente resuelven
a `hsl(var(--primary))`, `hsl(var(--foreground))`, etc. **Si esas variables CSS
no están declaradas en `:root`, el navegador no tiene nada que resolver y los
componentes caen al estilo nativo del navegador — fondo blanco, texto negro,
botones sin relleno.** Este es el síntoma de "todo blanco y negro" cuando
`shadcn-ui@latest init` no se ejecutó correctamente (es un comando interactivo
que puede fallar silenciosamente en un entorno no interactivo como Claude Code).

Esta skill es la única fuente de verdad de:
1. La paleta de marca (qué colores existen y para qué se usan)
2. El archivo `src/index.css` completo y exacto que debe existir en el panel web
3. El archivo `Theme.kt` completo y exacto que debe existir en la app Android
4. La tipografía de ambas plataformas

---

## 1. Identidad de marca

JoyasPOS es un sistema para una **joyería boutique**, no un SaaS B2B genérico.
La paleta refleja eso: tonos cálidos, dorado envejecido (no dorado brillante/cursi),
carbón profundo en lugar de negro puro, y un fondo marfil/crema en lugar de
blanco estéril. Los colores de estado (verde/amarillo/rojo para stock y
sincronización) son semánticos y se mantienen separados de la marca — nunca
se usan como color primario.

| Token | Uso | Hex aprox. |
|---|---|---|
| **Primario — Dorado antiguo** | Botones principales, links, nav activo, focus ring | `#A8763E` |
| **Secundario — Carbón cálido** | Sidebar, headers oscuros, texto principal | `#2B2622` |
| **Fondo — Marfil** | Fondo general de la app | `#FAF6EF` |
| **Superficie — Blanco cálido** | Cards, modales, inputs | `#FFFFFF` |
| Verde (éxito/stock OK/margen alto) | Semántico — nunca como marca | `#16A34A` |
| Ámbar (alerta/stock bajo/margen medio) | Semántico | `#D97706` |
| Rojo (crítico/stock bajo/margen bajo) | Semántico | `#DC2626` |
| Naranja (pendiente de sync) | Semántico — solo app móvil | `#EA580C` |

**Tipografía:**
- **Encabezados / marca:** `Playfair Display` (serif elegante — refuerza la sensación de boutique)
- **Cuerpo / UI / datos:** `Inter` (sans-serif legible para tablas, formularios, números)

---

## 2. Panel Web — `src/index.css`

> **Este archivo DEBE existir tal cual.** Sin él, ningún componente de
> shadcn/ui tiene color. Crear en `apps/web/src/index.css` y verificar
> que `main.tsx` lo importa (`import './index.css'`).

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ── Fondo y superficie — marfil cálido, no blanco estéril ──────────── */
    --background: 40 38% 97%;
    --foreground: 24 12% 14%;

    --card: 0 0% 100%;
    --card-foreground: 24 12% 14%;

    --popover: 0 0% 100%;
    --popover-foreground: 24 12% 14%;

    /* ── Marca — dorado antiguo ──────────────────────────────────────────── */
    --primary: 36 45% 41%;
    --primary-foreground: 40 38% 97%;

    /* ── Carbón cálido — usado en sidebar y elementos oscuros ────────────── */
    --secondary: 24 14% 16%;
    --secondary-foreground: 40 30% 94%;

    --muted: 36 20% 92%;
    --muted-foreground: 24 8% 42%;

    --accent: 36 30% 90%;
    --accent-foreground: 24 14% 16%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 98%;

    --border: 36 18% 85%;
    --input: 36 18% 85%;
    --ring: 36 45% 41%;

    --radius: 0.5rem;

    /* ── Sidebar (componente shadcn "sidebar") — carbón cálido ───────────── */
    --sidebar-background: 24 14% 14%;
    --sidebar-foreground: 40 30% 92%;
    --sidebar-primary: 36 50% 50%;
    --sidebar-primary-foreground: 24 14% 10%;
    --sidebar-accent: 24 12% 22%;
    --sidebar-accent-foreground: 40 30% 92%;
    --sidebar-border: 24 12% 24%;
    --sidebar-ring: 36 50% 50%;

    /* ── Estados semánticos (stock, margen, sync) ─────────────────────────
       NO usar estos como color de marca. Solo para indicadores de estado. */
    --status-success: 142 71% 35%;
    --status-warning: 32 95% 44%;
    --status-danger: 0 72% 51%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, sans-serif;
  }
  h1, h2, h3, h4 {
    font-family: 'Playfair Display', serif;
  }
}
```

---

## 3. Panel Web — `tailwind.config.ts`

> Reemplaza completamente el `tailwind.config.ts` de SKILL-21. La clave es
> que **cada color esté envuelto en `hsl(var(--xxx))`** — sin esto, Tailwind
> genera las clases (`bg-primary` existe) pero no apuntan a ningún valor real.

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Estados semánticos — usar SOLO para stock/margen/sync, nunca como marca
        'status-success': 'hsl(var(--status-success))',
        'status-warning': 'hsl(var(--status-warning))',
        'status-danger': 'hsl(var(--status-danger))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

---

## 4. Instalación de shadcn/ui — modo no interactivo

`pnpm dlx shadcn-ui@latest init` es un wizard interactivo (pregunta estilo,
color base, uso de CSS variables). En un entorno automatizado como Claude Code
esto puede colgarse o aplicar valores por defecto incorrectos sin avisar.

**Usar el flag `-y` con un `components.json` pre-creado en su lugar:**

### `components.json`
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

Con este archivo presente, `pnpm dlx shadcn-ui@latest add button input card ...`
(sin `init`) detecta la configuración y no pregunta nada — usa directamente
`src/index.css` y `tailwind.config.ts` ya definidos arriba. **No ejecutar
`init`** si `components.json` ya existe; ejecutar `add` directamente.

---

## 5. App Android — `ui/theme/Theme.kt`

> Reemplaza completamente el `Theme.kt` de SKILL-16. Misma identidad de marca
> que el panel web: dorado antiguo + carbón cálido + marfil.

```kotlin
package com.ltsoft.joyaspos.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ── Marca — dorado antiguo + carbón cálido + marfil ────────────────────────
val GoldPrimary = Color(0xFFA8763E)       // Dorado antiguo — botones, acentos
val GoldLight = Color(0xFFC9A267)         // Dorado claro — estados hover/disabled
val CharcoalDark = Color(0xFF2B2622)      // Carbón cálido — texto, headers oscuros
val IvoryBackground = Color(0xFFFAF6EF)   // Marfil — fondo general
val SurfaceWhite = Color(0xFFFFFFFF)      // Blanco cálido — cards, inputs

// ── Estados semánticos — NUNCA usar como color de marca ─────────────────────
val ErrorRed = Color(0xFFDC2626)
val WarningAmber = Color(0xFFD97706)
val SuccessGreen = Color(0xFF16A34A)
val PendingOrange = Color(0xFFEA580C)

private val LightColorScheme = lightColorScheme(
    primary = GoldPrimary,
    onPrimary = SurfaceWhite,
    primaryContainer = GoldLight,
    onPrimaryContainer = CharcoalDark,

    secondary = CharcoalDark,
    onSecondary = IvoryBackground,

    background = IvoryBackground,
    onBackground = CharcoalDark,

    surface = SurfaceWhite,
    onSurface = CharcoalDark,
    surfaceVariant = Color(0xFFF1EAE0),
    onSurfaceVariant = Color(0xFF5C5650),

    error = ErrorRed,
    onError = SurfaceWhite,

    outline = Color(0xFFD9CFC0),
)

@Composable
fun JoyasPOSTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = JoyasTypography,
        content = content,
    )
}
```

---

## 6. App Android — Tipografía con fuentes de marca

### `ui/theme/Type.kt` (actualizado)
```kotlin
package com.ltsoft.joyaspos.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.ltsoft.joyaspos.R

// Fuentes locales — descargar de Google Fonts y colocar en res/font/
// playfair_display_bold.ttf, playfair_display_semibold.ttf, inter_*.ttf
val PlayfairDisplay = FontFamily(
    Font(R.font.playfair_display_semibold, FontWeight.SemiBold),
    Font(R.font.playfair_display_bold, FontWeight.Bold),
)
val Inter = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
)

val JoyasTypography = Typography(
    // Título de pantalla — fuente de marca
    headlineMedium = TextStyle(
        fontFamily = PlayfairDisplay,
        fontSize = 22.sp,
        fontWeight = FontWeight.Bold,
    ),
    // Títulos de sección
    titleLarge = TextStyle(
        fontFamily = PlayfairDisplay,
        fontSize = 18.sp,
        fontWeight = FontWeight.SemiBold,
    ),
    titleMedium = TextStyle(fontFamily = Inter, fontSize = 16.sp, fontWeight = FontWeight.Medium),
    // Cuerpo de listas — mínimo 14sp
    bodyLarge = TextStyle(fontFamily = Inter, fontSize = 16.sp),
    bodyMedium = TextStyle(fontFamily = Inter, fontSize = 14.sp),
    // Labels y chips
    labelLarge = TextStyle(fontFamily = Inter, fontSize = 14.sp, fontWeight = FontWeight.Medium),
    labelSmall = TextStyle(fontFamily = Inter, fontSize = 12.sp),
)
```

> **Si no se quiere gestionar archivos `.ttf` locales en esta etapa**, usar
> `FontFamily.Serif` para `PlayfairDisplay` y `FontFamily.Default` para `Inter`
> como fallback temporal — el color de marca (dorado/carbón) ya resuelve la
> mayor parte del problema visual aunque la tipografía no sea exacta.

---

## 7. Reglas de uso de la paleta

1. **`primary` (dorado) es el ÚNICO color de marca** — botones principales, links activos, indicador de tab/nav seleccionado, focus ring.
2. **`secondary` (carbón) se usa para superficies oscuras** — sidebar del panel web, AppBar si se requiere un header oscuro.
3. **Los colores de estado (`status-success/warning/danger` en web; `SuccessGreen/WarningAmber/ErrorRed/PendingOrange` en Android) son exclusivos para indicadores** — nunca para botones de acción primaria ni elementos de marca.
4. **`background` (marfil) ≠ `card`/`surface` (blanco)** — esta diferencia de tono es la que da profundidad visual; si ambos son iguales, la UI se ve plana otra vez.
5. **Nunca hardcodear hex directamente en componentes** — siempre usar las clases Tailwind (`bg-primary`, `text-secondary-foreground`...) o `MaterialTheme.colorScheme.xxx` en Android. Si un componente tiene `style={{ color: '#A8763E' }}` o `Color(0xFFA8763E)` suelto fuera de `Theme.kt`, está mal — debe referenciar el token del tema.
