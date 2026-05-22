# Base de datos — Bloque

Registro de la base de datos del proyecto Supabase **"Organizador"**
(`ref: sehvjozffzbqeyaatwqn`, región `us-west-1`).

## Archivos

| Archivo | Contenido |
|---|---|
| `schema.sql` | Tablas, funciones y triggers. |
| `policies.sql` | Políticas Row Level Security (RLS). |

> Estos archivos son el **registro** de lo que se aplicó vía migraciones MCP.
> La fuente de verdad sigue siendo el proyecto Supabase.

## Modelo de datos

```
auth.users (Supabase Auth)
   │ 1
   │
   ├──1── profiles        preferencias del usuario
   │
   └──N── days            un plan de día por fecha
             │ 1
             └──N── blocks         bloques de trabajo del día
                       │ 1
                       └──N── breaks   microdescansos del bloque
```

- **profiles** — perfil 1:1 con el usuario. Ventana de trabajo, días activos,
  preferencias de notificación. Se crea solo con el trigger `on_auth_user_created`.
- **days** — un registro por usuario y fecha (`unique(user_id, date)`). Ciclo de
  vida en `status`: `planning → ready → in_progress → closed`.
- **blocks** — bloques de trabajo de un día. `segment_plan` (jsonb) guarda el plan
  de segmentos work/break calculado por Groq la noche anterior.
- **breaks** — un registro por microdescanso planeado. Permite la métrica
  "pausas respetadas vs saltadas" del resumen del día.

## Seguridad

- **RLS habilitado y forzado** en las 4 tablas. Regla única: `auth.uid() = user_id`
  (`= id` en `profiles`). Un usuario nunca ve datos de otro.
- Las funciones de trigger (`handle_new_user`, `set_updated_at`) tienen el
  `EXECUTE` revocado para `anon`/`authenticated`: no son invocables como RPC.
- `handle_new_user` es `SECURITY DEFINER` con `search_path = ''` (evita secuestro
  de search_path).
- `get_advisors(security)` ejecutado tras migrar: **0 hallazgos**.

## Migraciones aplicadas (en orden)

1. `create_profiles_and_helpers`
2. `create_days`
3. `create_blocks`
4. `create_breaks`
5. `harden_trigger_functions`
