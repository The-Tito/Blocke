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

## Documentación completa

Toda la información — arquitectura, base de datos, autenticación, flujo,
fundamento científico, seguridad — está en **[DOCUMENTACION.md](DOCUMENTACION.md)**.

El esquema de base de datos está registrado en **[db/](db/)**.
