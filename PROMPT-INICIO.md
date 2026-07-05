# PROMPT-INICIO.md — Prompt Inicial para Claude Code
## JoyasPOS — Arranque del Desarrollo

---

## Estrategia de desarrollo: API-First, Mobile-Second, Web-Third

El desarrollo se ejecuta en **bloques verticales por componente**, no en paralelo. Esto minimiza el cambio de contexto entre tecnologías y evita volver a un componente que ya se consideraba terminado.

```
┌─────────────────────────────────────────────────────┐
│  BLOQUE 1 — Scaffolding completo (Fase 0)           │
│  Monorepo + shared-types + API skeleton              │
│  + Android skeleton + Web skeleton                   │
│  Resultado: 3 proyectos compilando sin lógica        │
├─────────────────────────────────────────────────────┤
│  BLOQUE 2 — API completa (Fases 1A + 2A)            │
│  Auth → Validación → Ventas/Sync → Compras →         │
│  Proveedores → Usuarios → Reportes → Seed            │
│  Resultado: API 100% funcional, probada con curl     │
├─────────────────────────────────────────────────────┤
│  BLOQUE 3 — App Android completa (Fases 1B + 2B)    │
│  Room → DataStore → Retrofit → Hilt → Repository →   │
│  SyncWorker → Navegación → UI → Impresión Sunmi      │
│  Resultado: APK debug con flujo completo             │
├─────────────────────────────────────────────────────┤
│  BLOQUE 4 — Panel Web completo (Fases 1C + 2C)      │
│  Zustand → Router → Hooks → Formularios → Tablas →   │
│  Dashboard → Reportes → Compras → Gráficas           │
│  Resultado: Panel admin 100% funcional               │
├─────────────────────────────────────────────────────┤
│  BLOQUE 5 — Deploy (Fase 3)                          │
│  API en VPS → Web en VPS → APK Release firmado       │
│  Resultado: Sistema en producción                    │
└─────────────────────────────────────────────────────┘
```

**Justificación de este orden:**

1. **API primero** porque ambos clientes (mobile y web) la consumen. Si la API cambia después, hay que tocar dos clientes. Construirla completa de una vez evita eso.
2. **Mobile antes que web** porque el POS en el Sunmi V2SE es el producto principal — es lo que genera las ventas. El panel web solo las muestra y administra.
3. **Web al final** (antes del deploy) porque consume una API ya terminada y estable, lo que permite implementarla rápido sin sorpresas de endpoints incompletos.
4. **Sin paralelismo** porque es un desarrollador individual con Claude Code — cambiar entre Kotlin/Compose y React/TypeScript en la misma sesión reduce la productividad.

---

## Prompt para pegar en Claude Code

Copiar y pegar el siguiente bloque como primer mensaje en Claude Code al iniciar el proyecto:

---

```
Vas a desarrollar JoyasPOS, un sistema POS de joyería para El Salvador con 3 componentes: app Android para Sunmi V2SE (Kotlin + Jetpack Compose), API REST (Fastify + Prisma + MySQL) y panel web administrativo (React + TypeScript + Vite).

DOCUMENTACIÓN DEL PROYECTO:

Tienes disponible la siguiente documentación que DEBES leer antes de escribir código:

1. CLAUDE.md — Reglas no negociables, modelo de datos, endpoints, flujo de pantallas. LEER PRIMERO.
2. ROADMAP.md — Plan de ejecución por fases con checklists de validación. Define qué hacer y en qué orden.
3. DOD.md — Definition of Done por componente. Define cuándo algo está terminado.
4. PRD.md — Visión del producto, funcionalidades, arquitectura.
5. SRS.md — Especificaciones técnicas, validaciones, restricciones.
6. HISTORIAS_USUARIO.md — 29 historias de usuario con criterios de aceptación.
7. CASOS_DE_USO.md — 9 casos de uso con flujos principales y alternativos.

SKILLS TÉCNICAS (33 archivos en skills/):

Cada skill es una guía técnica con código listo para implementar. Están en skills/{nombre}/SKILL.md. DEBES leer la skill correspondiente ANTES de implementar cada paso — contienen el código exacto, patrones obligatorios y reglas de negocio específicas.

ESTRATEGIA DE DESARROLLO:

El desarrollo sigue bloques verticales por componente, NO en paralelo:

BLOQUE 1 — Scaffolding (Fase 0 del ROADMAP):
  Skills: monorepo-setup → shared-types → fastify-project-structure → prisma-mysql → android-project-structure → react-project-structure
  Resultado esperado: 3 proyectos compilando sin lógica de negocio

BLOQUE 2 — API completa (Fases 1A + 2A del ROADMAP):
  Skills: fastify-auth-jwt → fastify-zod-validation → api-ventas-sync → api-compras-proveedores → api-reportes
  Resultado esperado: API con todos los endpoints operativos, probados con curl

BLOQUE 3 — App Android completa (Fases 1B + 2B del ROADMAP):
  Skills: room-database → datastore-preferences → retrofit-okhttp-setup → hilt-dependency-injection → repository-pattern-offline-first → workmanager-syncworker → jetpack-compose-navigation → compose-ui-sunmi → mvvm-viewmodel-stateflow → sunmi-printer-sdk
  Resultado esperado: APK debug con flujo completo de ventas offline-first + impresión

BLOQUE 4 — Panel Web completo (Fases 1C + 2C del ROADMAP):
  Skills: zustand-auth-store → react-router-auth-guards → tanstack-query-axios → react-hook-form-zod → tanstack-table → period-filter-component → kpi-cards-dashboard → recharts-reportes → nueva-compra-form
  Resultado esperado: Panel admin 100% funcional con dashboard, reportes, CRUD y gráficas

BLOQUE 5 — Deploy (Fase 3 del ROADMAP):
  Skills: deploy-api-vps → deploy-web-vps → android-release-build
  Resultado esperado: Sistema en producción

PROTOCOLO DE TRABAJO:

1. Al inicio de cada sesión: leer CLAUDE.md + ROADMAP.md para ubicarte en la fase actual.
2. Antes de implementar un paso: leer la skill correspondiente completa.
3. Tras completar un paso: verificar con el checklist de validación de esa subfase en ROADMAP.md.
4. Tras completar un bloque: verificar con el checkpoint de fase en ROADMAP.md.
5. Al terminar la sesión: actualizar PROGRESO.md con la fase actual, skill completada y próximo paso.

ARCHIVO DE CONTINUIDAD:

Crear y mantener un archivo PROGRESO.md en la raíz del monorepo con este formato:
- Fecha de la sesión
- Fase y subfase actual
- Skill actual y su estado (en progreso / completada)
- Próximo paso
- Fases completadas con fecha
- Notas relevantes para la siguiente sesión

EMPIEZA AHORA:

Lee CLAUDE.md y ROADMAP.md. Luego inicia la Fase 0 — Subfase 0.1: lee la skill monorepo-setup (skills/monorepo-setup/SKILL.md) y crea toda la estructura del monorepo según esa skill. Después continúa con shared-types. Al terminar ambas, valida con el checklist de la subfase 0.1 del ROADMAP.
```

---

## Prompts de continuación entre sesiones

Si Claude Code pierde contexto (nueva sesión, compactación, timeout), usar este prompt de reconexión:

```
Estamos desarrollando JoyasPOS. Lee PROGRESO.md para saber dónde quedamos. Luego lee CLAUDE.md para refrescar las reglas. Luego lee ROADMAP.md para entender el plan. Continúa desde donde indica PROGRESO.md — lee la skill correspondiente antes de escribir código.
```

Si se completó un bloque y se va a iniciar el siguiente:

```
El Bloque N está terminado. Lee ROADMAP.md y verifica el checkpoint de la Fase correspondiente. Si todo está validado, inicia el Bloque N+1 leyendo la primera skill de esa fase. Actualiza PROGRESO.md.
```

---

## Notas importantes para el desarrollador

1. **No omitir la lectura de skills.** Cada skill tiene 250-500 líneas de código validado y reglas específicas. Reimplementar sin leerlas producirá bugs ya resueltos en la documentación.

2. **Los checkpoints son obligatorios.** No avanzar de fase sin verificar el checkpoint. Los issues que se detectan tarde en el proceso son 10x más costosos de corregir.

3. **PROGRESO.md es el eslabón más crítico.** Sin él, cada sesión de Claude Code arranca de cero y puede reimplementar o contradecir trabajo anterior.

4. **La API se construye y se prueba con curl antes de tocar los clientes.** Esto garantiza que cuando se implemente la app Android o el panel web, los endpoints ya están probados y estables.

5. **El dispositivo Sunmi V2SE real es necesario para la Fase 2B.** La impresión no funciona en emulador — planificar tener el dispositivo disponible para esa fase.
