# Bloque — Documentación de la aplicación

> Estructura para los días que ya decidiste trabajar.
> Versión 0.1 · web · mayo 2026

---

## Índice

1. [Qué es Bloque](#1-qué-es-bloque)
2. [El problema y la idea central](#2-el-problema-y-la-idea-central)
3. [Qué se implementó](#3-qué-se-implementó)
4. [Stack tecnológico](#4-stack-tecnológico)
5. [Arquitectura](#5-arquitectura)
6. [Estructura de carpetas](#6-estructura-de-carpetas)
7. [Base de datos](#7-base-de-datos)
8. [Autenticación](#8-autenticación)
9. [API e IA: Groq vía Edge Functions](#9-api-e-ia-groq-vía-edge-functions)
10. [El motor de microdescansos y su fundamento científico](#10-el-motor-de-microdescansos-y-su-fundamento-científico)
11. [Flujo completo de la aplicación](#11-flujo-completo-de-la-aplicación)
12. [Las vistas, una por una](#12-las-vistas-una-por-una)
13. [Notificaciones](#13-notificaciones)
14. [Seguridad](#14-seguridad)
15. [Cómo ejecutar el proyecto](#15-cómo-ejecutar-el-proyecto)
16. [Roadmap — Fase 2](#16-roadmap--fase-2)

---

## 1. Qué es Bloque

Bloque es un sistema de **time blocking con microdescansos inteligentes**. El
usuario define qué quiere hacer y por cuánto tiempo; la app, apoyada en
inteligencia artificial y evidencia científica, decide **cuándo pausar, por
cuánto tiempo y qué hacer en esa pausa** para sostener trabajo de calidad
durante horas.

El ciclo de uso es deliberadamente simple: la noche anterior se planea el día
en menos de dos minutos, y al día siguiente la app lleva al usuario de un bloque
al siguiente como un GPS — solo hay que presionar "iniciar" y obedecer cuando
diga que toca parar.

**Lo que Bloque NO es:** no es un gestor de tareas (sin listas, etiquetas ni
proyectos), no es un calendario (no se integra con Google Calendar). Entra en
escena cuando ya sabes qué vas a hacer hoy y necesitas ejecutarlo.

---

## 2. El problema y la idea central

Tienes trabajo importante que hacer pero el día se va sin hacerlo. No es falta
de motivación: es **fricción de arranque y ausencia de estructura**. Abres
Notion para planear y terminas configurando una base de datos. No tienes claro
cuándo descansar, así que o no descansas o te pierdes 40 minutos en el teléfono.

Bloque resuelve esto siendo lo opuesto a Notion: **sin configuración, sin
flexibilidad innecesaria, sin fricción**. Una app opinionada que toma decisiones
por ti para que solo tengas que ejecutar.

Dos principios de diseño guían toda la app:

- **Sin fricción al planear.** Tres datos por bloque y listo.
- **Fricción intencional al saltarse la pausa.** Saltar un descanso es posible
  —Bloque no es paternalista— pero requiere una confirmación consciente.

---

## 3. Qué se implementó

Esta primera versión es una **aplicación web completa y funcional** en React,
operativa en navegador de escritorio y de teléfono. Incluye:

- **Autenticación completa** (registro, inicio de sesión, sesión persistente)
  sobre Supabase Auth.
- **Base de datos PostgreSQL** con 4 tablas, Row Level Security forzado en
  todas, triggers y restricciones de integridad.
- **Planeador del día**: crear, editar, reordenar y eliminar bloques, con
  control de no sobre-asignar horas.
- **Motor de microdescansos con IA**: al guardar un bloque, una Edge Function
  llama a Groq y calcula el plan de segmentos work/break.
- **Ejecutor de bloques**: modo enfoque a pantalla completa, timer robusto a
  recargas, transición automática a la vista de descanso.
- **Vista de descanso** con actividad, cuenta regresiva y fundamento científico.
- **Resumen del día** con métricas y una observación generada por IA.
- **Ajustes**: horario de trabajo, días activos, notificaciones, tema.
- **Notificaciones** locales vía Service Worker en los cuatro momentos clave.
- **9 vistas** + splash, fieles al sistema visual de la carpeta `Desing/`.
- **Documento final** (este archivo) y el esquema de base de datos en `db/`.

Todo construido siguiendo **arquitectura limpia, principios SOLID y buenas
prácticas de seguridad**.

---

## 4. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| UI | **React 18** + **Vite 5** | Estándar moderno, arranque y HMR rápidos. |
| Estilos | **TailwindCSS 3** + CSS del sistema visual | Tokens del diseño + utilidades. |
| Routing | **react-router-dom 6** | Rutas declarativas y guardas de acceso. |
| Estado de servidor | **@tanstack/react-query 5** | Caché, revalidación y mutaciones. |
| Backend | **Supabase** | Postgres administrado, Auth y Edge Functions. |
| Base de datos | **PostgreSQL 17** | Relacional, con Row Level Security. |
| IA | **Groq API** | Inferencia de muy baja latencia (LLM rápidos). |
| Funciones servidor | **Supabase Edge Functions** (Deno) | Proxy seguro hacia Groq. |
| Notificaciones | **Notification API + Service Worker** | Avisos sin servidor de push. |

---

## 5. Arquitectura

Bloque sigue **arquitectura limpia**: el código se organiza en capas
concéntricas y **las dependencias apuntan siempre hacia adentro**. El dominio no
sabe nada de React, de Supabase ni de Groq.

```
┌──────────────────────────────────────────────────────┐
│  ui/  ·  hooks/  ·  app/        (React, presentación)  │
│     │                                                  │
│     ▼  depende de                                      │
│  application/   casos de uso  ──► ports.js (contratos) │
│     │                                                  │
│     ▼  depende de                                      │
│  domain/        entidades y reglas puras (sin deps)    │
│                                                        │
│  infrastructure/  adaptadores ──► IMPLEMENTAN ports.js │
│        (Supabase, Groq, notificaciones)                │
└──────────────────────────────────────────────────────┘
         app/services.js  =  raíz de composición
```

### Las capas

- **`domain/`** — Entidades y reglas de negocio puras. Cero dependencias
  externas. Aquí viven: la validación de un bloque (`block.js`), las reglas de
  la línea del día (`timeline.js`), la estructura del plan de segmentos
  (`segmentPlan.js`), el catálogo de tipos de trabajo (`workTypes.js`), la
  lógica pura del timer (`execution.js`) y el cálculo de métricas
  (`daySummary.js`). Todo es testeable sin navegador ni red.

- **`application/`** — Casos de uso. Orquestan el dominio y los **puertos**
  (`ports.js`): interfaces que describen lo que la app necesita (un
  `BlockRepository`, un `AiGateway`…). Los servicios son **funciones fábrica**
  que reciben sus dependencias por inyección — no importan Supabase nunca.

- **`infrastructure/`** — Adaptadores concretos que **implementan** los puertos:
  Supabase (auth, repositorios), Groq (`groqGateway`), notificaciones
  (`notifier`). Intercambiables.

- **`ui/` + `hooks/` + `app/`** — React. Las páginas consumen hooks; los hooks
  consumen los servicios de aplicación.

- **`app/services.js`** — **Raíz de composición**: el único punto donde la
  aplicación se "cablea" con la infraestructura concreta.

### SOLID aplicado

- **S — Responsabilidad única**: cada archivo y cada capa tiene un solo motivo
  de cambio. `domain/timeline.js` solo sabe de agendar; `groqGateway.js` solo
  habla con la IA.
- **O — Abierto/cerrado**: el catálogo `workTypes.js` permite añadir tipos de
  trabajo sin tocar el resto del código.
- **L — Sustitución de Liskov**: cualquier objeto que cumpla la forma de un
  puerto puede sustituir al adaptador real.
- **I — Segregación de interfaces**: los puertos son pequeños y específicos
  (`AuthGateway`, `DayRepository`, `AiGateway`…), no una interfaz monolítica.
- **D — Inversión de dependencias**: la capa de aplicación depende de
  abstracciones (`ports.js`), no de Supabase ni de Groq. Por eso migrar a React
  Native en la fase 2 solo exige escribir nuevos adaptadores.

---

## 6. Estructura de carpetas

```
bloque/
├── db/                         Registro del esquema de base de datos
│   ├── schema.sql                tablas, funciones, triggers
│   ├── policies.sql              políticas Row Level Security
│   └── README.md                 modelo de datos y notas
├── public/
│   ├── sw.js                     Service Worker de notificaciones
│   └── icon.svg                  ícono de la app
├── supabase/functions/         Edge Functions (Deno)
│   ├── groq-segment-plan/        plan de microdescansos
│   └── groq-day-summary/         observación del día
├── src/
│   ├── domain/                   entidades y reglas puras
│   │   ├── block.js  segmentPlan.js  timeline.js
│   │   ├── workTypes.js  execution.js  daySummary.js
│   ├── application/              casos de uso + contratos
│   │   ├── ports.js              contratos (puertos)
│   │   ├── planningService.js    planeación
│   │   ├── executionService.js   ejecución
│   │   └── summaryService.js     resumen
│   ├── infrastructure/           adaptadores
│   │   ├── supabase/             client, authGateway, repositorios
│   │   ├── ai/groqGateway.js     adaptador de IA
│   │   └── notifications/notifier.js
│   ├── ui/
│   │   ├── components/           primitivas del sistema visual
│   │   ├── layouts/              AppShell, SplitLayout
│   │   └── pages/                las 9 vistas
│   ├── hooks/                    useProfile, useDayPlan, useExecutionEngine
│   ├── app/                      App, router, services, AuthProvider
│   ├── lib/                      time, theme (utilidades puras)
│   ├── styles/index.css          sistema visual
│   └── main.jsx                  punto de entrada
├── .env.example                  plantilla de variables
└── DOCUMENTACION.md              este documento
```

---

## 7. Base de datos

PostgreSQL administrado por Supabase. Proyecto **"Organizador"**
(`ref: sehvjozffzbqeyaatwqn`). Las tablas se crearon vía migraciones MCP; el
registro fiel está en [`db/schema.sql`](db/schema.sql) y
[`db/policies.sql`](db/policies.sql).

### Modelo de datos

```
auth.users (Supabase Auth)
   ├──1── profiles      preferencias del usuario
   └──N── days          un plan de día por fecha
             └──N── blocks        bloques de trabajo
                       └──N── breaks   microdescansos
```

### Tablas

**`profiles`** — Un perfil 1:1 con el usuario. Se crea **automáticamente** con
el trigger `on_auth_user_created` al registrarse.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | FK a `auth.users` |
| `full_name` | text | nombre del usuario |
| `work_window_start` / `work_window_end` | time | ventana de trabajo (`check` start < end) |
| `active_days` | int[] | días activos (0=Dom … 6=Sáb) |
| `notif_prefs` | jsonb | preferencias de notificación |
| `created_at` / `updated_at` | timestamptz | `updated_at` por trigger |

**`days`** — Un plan de día por usuario y fecha (`unique(user_id, date)`).
Ciclo de vida en `status`: `planning → ready → in_progress → closed`.
Guarda `summary_note` (observación de la IA) y `closed_at`.

**`blocks`** — Cada bloque de trabajo. Campos clave: `title`, `work_type`,
`duration_min` (`check` 5–480), `position` (orden), `scheduled_start/end`,
`status` (`pending|active|done|skipped`), `actual_work_sec` y `segment_plan`
(jsonb, la salida de Groq).

**`breaks`** — Un registro por microdescanso planeado. Guarda `activity`,
`rationale`, `duration_sec` y `status` (`pending|respected|skipped`). Es lo que
permite la métrica "pausas respetadas vs saltadas" del resumen.

### Forma del `segment_plan`

```json
{
  "segments": [
    { "index": 0, "kind": "work",  "duration_min": 25 },
    { "index": 1, "kind": "break", "duration_min": 5,
      "activity": "Mira a 6 metros durante 30 segundos",
      "rationale": "Regla 20-20-20: relaja los músculos ciliares." }
  ]
}
```

### Integridad y seguridad de la BD

- **Row Level Security habilitado y forzado** (`force row level security`) en
  las 4 tablas. Regla única: `auth.uid() = user_id` (`= id` en `profiles`). Un
  usuario nunca puede leer ni escribir filas de otro.
- Restricciones `CHECK` en duraciones, longitud de título, enums de estado y
  ventana de trabajo.
- Índices en todas las claves foráneas.
- Las funciones de trigger tienen el `EXECUTE` revocado para los roles
  `anon`/`authenticated`: no son invocables como RPC.
- `get_advisors(security)` ejecutado tras las migraciones: **0 hallazgos**.

---

## 8. Autenticación

Implementada con **Supabase Auth** (correo + contraseña).

- **Registro** (`signUp`): crea el usuario en `auth.users`; el trigger
  `handle_new_user` crea su fila en `profiles`. El nombre se pasa en el
  `user_metadata`. Si el proyecto exige confirmar el correo, la app muestra una
  pantalla "Revisa tu correo" en lugar de dejar al usuario en un callejón sin
  salida.
- **Inicio de sesión** (`signInWithPassword`): los errores de Supabase se
  traducen a mensajes claros en español (`authGateway.js`).
- **Sesión**: `AuthProvider` mantiene la sesión en contexto de React,
  escuchando `onAuthStateChange`. La sesión se **persiste** y el token se
  **refresca automáticamente** (configurado en el cliente Supabase).
- **Guardas de ruta** (`router.jsx`): `Protected` exige sesión y redirige a
  `/login`; `GuestOnly` evita que un usuario con sesión vea login/registro.
- El **JWT del usuario** se envía automáticamente en cada llamada a la base de
  datos (lo que activa RLS) y a las Edge Functions (que lo verifican).

---

## 9. API e IA: Groq vía Edge Functions

### Por qué Edge Functions

La `GROQ_API_KEY` **nunca llega al navegador**. Si el cliente llamara a Groq
directamente, la clave quedaría expuesta en el bundle y cualquiera podría
extraerla. La solución correcta es un **proxy del lado del servidor**: dos
Supabase Edge Functions (Deno) que reciben la petición del navegador (con el
JWT del usuario, que se verifica), llaman a Groq con la clave —que vive como
*secret* del proyecto— y devuelven solo el resultado.

### Las dos funciones

**`groq-segment-plan`** — Calcula el plan de microdescansos de un bloque.

- Entrada: `{ work_type, duration_min, scheduled_start, accumulated_work_min }`.
- Modelo: **`llama-3.1-8b-instant`** — elegido por su **latencia muy baja**: el
  cálculo ocurre en segundo plano mientras el usuario planea y debe sentirse
  instantáneo.
- Salida: el JSON `segment_plan` con la secuencia work/break.

**`groq-day-summary`** — Genera la observación del resumen del día.

- Entrada: las métricas agregadas del día.
- Modelo: **`llama-3.3-70b-versatile`** — aquí prima la **calidad** del texto
  reflexivo sobre la velocidad; es un único cálculo al cerrar el día.
- Salida: `{ note }` — una observación breve, sin juicio ni gamificación.

### Resiliencia: triple respaldo

El plan de microdescansos es crítico — la app no puede quedarse sin él. Por eso
hay **tres niveles**:

1. **Groq** genera el plan (camino normal).
2. Si Groq falla o tarda demasiado, la Edge Function devuelve un **plan
   determinista basado en reglas** (mismo fundamento científico).
3. Si la red cae por completo y ni la Edge Function responde, el cliente usa un
   **respaldo local** (`domain/segmentPlan.js → clientFallbackPlan`).

Cada respuesta incluye un campo `source` (`groq` / `fallback` / `offline`) para
trazabilidad. **Consecuencia práctica:** la app funciona aunque la
`GROQ_API_KEY` no esté configurada todavía — simplemente usa los planes basados
en reglas hasta que se añada la clave.

---

## 10. El motor de microdescansos y su fundamento científico

Los intervalos y las actividades de descanso **no son arbitrarios**. El modelo
de IA (y el respaldo por reglas) se apoyan en tres marcos de investigación, que
también forman parte del *prompt* del sistema:

1. **Teoría de restauración de la atención (Kaplan & Kaplan).** La atención
   dirigida —la que se usa al programar o editar— se agota con el uso sostenido
   y se recupera con estímulos que no exigen esfuerzo cognitivo: naturaleza,
   vistas abiertas, caminar sin destino. Tras trabajo cognitivo intenso, la
   pausa ideal es mirar por una ventana o salir, no revisar el teléfono.

2. **Regla 20-20-20 (fatiga visual digital).** El trabajo de pantalla,
   especialmente código y edición, acumula tensión en los músculos ciliares del
   ojo. Cada 20 minutos de pantalla conviene mirar algo a 20 pies (≈6 m) durante
   20 segundos. Bloque incorpora esto en los descansos de código y edición.

3. **Ergonomía ocupacional (trabajo sedentario).** Estar sentado más de 60–90
   minutos sin interrupción aumenta la tensión muscular en cuello, hombros y
   zona lumbar y se asocia a caída de la función cognitiva. Los microdescansos
   **con movimiento específico** —no solo pararse— producen recuperación real.

Cómo se traduce en reglas:

- **Código / edición / diseño** → segmentos de ~25 min, pausas con la regla
  20-20-20 y estiramiento cervical.
- **Escritura / lectura / admin** → segmentos de ~30 min, pausas de restauración
  de atención (mirar lejos, caminar, respiración diafragmática).
- **Reuniones / grabación** → pocas pausas o ninguna: el cuerpo ya cambia de
  modo por sí mismo.

El plan se calcula **una sola vez**, al guardar el bloque la noche anterior, y
se guarda en `blocks.segment_plan`. Cuando el usuario ejecuta el bloque al día
siguiente, el timer ya sabe exactamente qué pasará y cuándo: **sin llamadas a
internet, sin latencia, sin sorpresas**.

---

## 11. Flujo completo de la aplicación

```
  Registro / Login
        │
        ▼
  ┌───────────┐   noche anterior
  │  PLANEAR  │   crear bloques → la IA calcula sus microdescansos
  └─────┬─────┘   "marcar como listo" → el día queda 'ready'
        │
        ▼   al día siguiente
  ┌───────────┐
  │    HOY    │   dashboard: plan listo / en curso / cierre
  └─────┬─────┘   "iniciar bloque"
        │
        ▼
  ┌───────────┐   timer del segmento de trabajo
  │ EJECUTAR  │◄────────────┐
  └─────┬─────┘             │  vuelve automáticamente
        │ termina segmento  │
        ▼                   │
  ┌───────────┐             │
  │ DESCANSO  │─────────────┘
  └─────┬─────┘   actividad + cuenta regresiva + porqué
        │ último segmento del último bloque
        ▼
  ┌───────────┐
  │  RESUMEN  │   métricas + observación de la IA
  └───────────┘   "planear mañana"
```

**Detalle del flujo:**

1. El usuario se registra o inicia sesión.
2. **Planea** el día siguiente: añade bloques (título, tipo, duración). Al
   guardar cada uno, la app llama a Groq en segundo plano (indicador
   "calculando microdescansos…") y el bloque aparece en la línea de tiempo con
   su plan interno ya calculado. La app **no deja asignar más horas** que la
   ventana de trabajo. Al terminar, "marcar como listo".
3. Al día siguiente, **Hoy** muestra el plan. El usuario pulsa "iniciar".
4. La **vista de ejecución** ocupa la pantalla: nombre de la tarea, tiempo
   restante del segmento en grande, barra de segmentos. Sin distracciones.
5. Cuando el segmento termina, una **notificación** avisa y la vista se
   transforma en la **vista de descanso** (lienzo invertido): actividad, cuenta
   regresiva y el porqué científico. Saltar la pausa requiere confirmación.
6. Al terminar la pausa, otra notificación y vuelta automática al trabajo.
7. Al completar el último bloque (o al cerrar el día manualmente), la **vista de
   resumen** muestra métricas limpias y una observación de la IA.

El timer es **robusto a recargas**: persiste el instante de inicio del segmento
(`segmentStartedAt`) y calcula el tiempo restante con el reloj de pared. Si se
recarga la página a mitad de un bloque, el tiempo sigue siendo correcto.

---

## 12. Las vistas, una por una

| # | Vista | Ruta | Descripción |
|---|---|---|---|
| 0 | **Splash** | — | Pantalla de carga mientras se resuelve la sesión. |
| 1 | **Login** | `/login` | Inicio de sesión, layout partido marca/formulario. |
| 2 | **Registro** | `/register` | Creación de cuenta con medidor de fuerza de contraseña. |
| 3 | **Hoy** | `/` | Dashboard del día. Cambia de estado: plan limpio en la mañana, bloque activo durante el trabajo, enlace al resumen al cerrar. |
| 4 | **Planear** | `/plan` | Línea de tiempo del día siguiente. Modal para crear bloques; reordenar / editar / eliminar; control de horas. |
| 5 | **Ejecutar** | `/exec` | Modo enfoque a pantalla completa: timer enorme, anillo de progreso, barra de segmentos. |
| 6 | **Descanso** | `/exec` | Misma ruta: la vista de ejecución se transforma en lienzo invertido al terminar un segmento. Actividad + cuenta regresiva + porqué. |
| 7 | **Resumen** | `/resumen` | Métricas del día y observación de la IA. Sin gamificación. |
| 8 | **Ajustes** | `/ajustes` | Horario de trabajo, días activos, notificaciones, tema. |

El sistema visual replica la carpeta `Desing/`: estética **monocromática**,
tipografía **Geist / Geist Mono**, tema claro y oscuro. Las vistas son
**responsivas**: el armazón de dos columnas colapsa en móvil.

---

## 13. Notificaciones

Las notificaciones son la columna vertebral operativa de Bloque. Se implementan
con la **Notification API** del navegador a través de un **Service Worker**
(`public/sw.js`), de modo que aparezcan aunque la pestaña esté en segundo plano.
Las dispara el propio timer de la app (no hay servidor de push).

Cuatro momentos accionables:

1. **Inicio del primer bloque** del día.
2. **Fin de un segmento de trabajo** → empieza la pausa (incluye la actividad).
3. **Fin de la pausa** → vuelta al trabajo.
4. **Día completo** → todos los bloques terminados.

Cada tipo se puede activar/desactivar en Ajustes, junto con una campana suave
opcional. El adaptador `notifier.js` implementa un puerto abstracto: la fase 2
podrá sustituirlo por **Web Push real** sin tocar el resto de la app.

---

## 14. Seguridad

Buenas prácticas aplicadas a lo largo de todo el proyecto:

- **Row Level Security forzado** en las 4 tablas. Ningún usuario puede acceder a
  datos de otro. Es lo que hace seguro exponer la clave pública en el cliente.
- **Secreto de IA fuera del cliente.** La `GROQ_API_KEY` vive como *secret* de
  las Edge Functions; jamás se incluye en el bundle del navegador.
- **`.env` solo con valores públicos** (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`). El `.env` está en `.gitignore`; se versiona
  `.env.example`.
- **Edge Functions con verificación de JWT** (`verify_jwt: true`) y validación
  estricta de toda la entrada; manejo de errores con respaldo determinista.
- **Validación en dos niveles**: en el cliente (`domain/block.js`) y en la base
  de datos (restricciones `CHECK`).
- **Funciones `SECURITY DEFINER` endurecidas**: `search_path = ''` y `EXECUTE`
  revocado para los roles públicos.
- **Cabeceras de seguridad** en el servidor de desarrollo (`vite.config.js`):
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- **Content-Security-Policy**: en producción debe aplicarse como **cabecera
  HTTP** desde el hosting. CSP recomendada:

  ```
  default-src 'self';
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  script-src 'self'; worker-src 'self';
  base-uri 'self'; form-action 'self'
  ```

  No se pone como `<meta>` porque el servidor de desarrollo de Vite necesita
  scripts inline para el *hot reload*.
- `get_advisors(security)` de Supabase ejecutado tras las migraciones: **sin
  hallazgos**.

---

## 15. Cómo ejecutar el proyecto

### Requisitos

- Node.js 20+ y npm.
- El proyecto Supabase "Organizador" ya está creado, con tablas, RLS y las dos
  Edge Functions desplegadas.

### Pasos

```bash
cd bloque
npm install
cp .env.example .env      # ya viene con VITE_SUPABASE_URL y la anon key
npm run dev               # http://localhost:5173
```

El archivo `.env` ya está creado con la URL del proyecto y la
**publishable key** (es pública y segura por diseño, gracias a RLS).

### Configurar la IA de Groq (opcional pero recomendado)

Sin la clave de Groq la app **funciona igualmente** usando los planes de
microdescansos basados en reglas. Para activar la IA real:

1. Consigue una API key en <https://console.groq.com>.
2. En el **Supabase Dashboard** del proyecto → **Edge Functions → Secrets**,
   añade el secret:

   ```
   GROQ_API_KEY = gsk_...
   ```

   (No hace falta redesplegar: las funciones leen el secret en cada invocación.)

### Confirmación de correo

El proyecto Supabase tiene activada la **confirmación de correo**. El registro
funciona, pero el usuario debe abrir el enlace que recibe antes de iniciar
sesión. Para una experiencia sin fricción en uso personal, puedes desactivarla
en **Dashboard → Authentication → Sign In / Providers → Email → "Confirm
email"**.

### Scripts disponibles

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR. |
| `npm run build` | Build de producción en `dist/`. |
| `npm run preview` | Sirve el build de producción. |
| `npm run lint` | ESLint sobre `src/`. |

---

## 16. Roadmap — Fase 2

La fase 2 es la **migración a React Native** para empaquetar Bloque como app
nativa de iPhone. Gracias a la arquitectura limpia, el plan es directo:

- Las capas **`domain/` y `application/` se reutilizan tal cual** — no dependen
  del navegador.
- Solo hay que escribir **nuevos adaptadores de infraestructura** (la UI nativa,
  el almacenamiento, las notificaciones) y una nueva raíz de composición.
- Las **notificaciones** pasan de la Notification API a notificaciones del
  sistema operativo (pantalla de bloqueo, sonido, accionables sin abrir la app).
- Distribución inicial por **TestFlight**, con opción de App Store más adelante.

Otras mejoras previstas: vista de historial, Web Push real para la versión web,
y preferencias personales de descanso (tipos favoritos, duración mínima de
segmento).

---

*Bloque v0.1 — construido con React, Vite, TailwindCSS, Supabase y Groq.*
