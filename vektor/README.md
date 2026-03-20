# Vektor Training — Guía de despliegue

## Paso 1 — Supabase

1. Ve a https://supabase.com y crea un proyecto
2. Ve a **SQL Editor** → pega el contenido de `supabase_schema.sql` → **Run**
3. Ve a **Settings → API Keys** y copia:
   - **Project URL**
   - **Publishable key** (empieza con `sb_publishable_`)
4. Crea tu usuario coach en **Authentication → Users → Add user**
5. Copia su UUID y ejecuta en SQL Editor:
   ```sql
   update public.profiles set role = 'coach', name = 'Tu Nombre'
   where id = 'TU-UUID-AQUI';
   ```

## Paso 2 — GitHub

1. Crea un repositorio nuevo en https://github.com llamado `vektor-training`
2. Sube **todos los archivos y carpetas** de esta carpeta arrastrándolos a GitHub
3. Commit

## Paso 3 — Vercel

1. Ve a https://vercel.com → **Add New Project**
2. Conecta GitHub y selecciona `vektor-training`
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` → tu Project URL
   - `VITE_SUPABASE_ANON_KEY` → tu publishable key
4. Deja **Root Directory** vacío (`./`)
5. **Deploy**

## Crear atletas

Desde Supabase → Authentication → Users → Add user
Luego actualiza el perfil en SQL:
```sql
update public.profiles set role = 'athlete', name = 'Nombre Atleta', sport = 'Fútbol'
where id = 'UUID-DEL-ATLETA';
```

## URL final

Tu app quedará en: `https://vektor-training.vercel.app`
(o similar según el nombre disponible en Vercel)
