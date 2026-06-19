# Bloque

> Estructura para los días que ya decidiste trabajar.

Sistema de **time blocking con microdescansos calculados por IA**. Planeas tu
día en menos de dos minutos y la app te lleva de un bloque al siguiente,
decidiendo cuándo pausar, por cuánto y qué hacer en la pausa.

## Stack

React · Vite · TailwindCSS · Supabase (Auth + PostgreSQL) · Groq (vía Edge Functions)

## Arranque rápido

```bash
npm install
cp .env.example .env     # ya trae la URL y la anon key del proyecto
npm run dev              # http://localhost:5173
```

Para activar la IA real de Groq, añade el secret `GROQ_API_KEY` en el Supabase
Dashboard (Edge Functions → Secrets). Sin ella, la app usa planes de
microdescansos basados en reglas.

## Despliegue (Vercel)

El bundle del cliente necesita las variables `VITE_*` en build. Si faltan, la app
muestra el aviso "Falta configurar el entorno" (ya no se queda en blanco), pero no
funcionará. Checklist:

1. **Vercel → Settings → Environment Variables** (scopes Production, Preview y
   Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (la anon/publishable key — pública por diseño; las
     tablas están protegidas con RLS).
   > El prefijo `VITE_` es obligatorio y las variables **no** se aplican a deploys
   > previos: tras añadirlas hay que **Redeploy** (sin caché).
2. **Supabase → Authentication → URL Configuration**: añade el dominio de Vercel
   (y los de preview) a *Site URL* y *Redirect URLs*, o el login por email no
   redirige bien.
3. **Edge Functions**: despliega con la config versionada (`supabase/config.toml`,
   `verify_jwt = true`) y configura el secret `GROQ_API_KEY`.

## Documentación completa

Toda la información — arquitectura, base de datos, autenticación, flujo,
fundamento científico, seguridad — está en **[DOCUMENTACION.md](DOCUMENTACION.md)**.

El esquema de base de datos está registrado en **[db/](db/)**.
