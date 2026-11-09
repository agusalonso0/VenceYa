# VenceYa 🧡

Primera versión funcional de VenceYa: aplicación web instalable (PWA) para organizar vencimientos y pagos.

## Requisitos
- Node.js 20 o superior
- Una cuenta gratuita en Supabase
- GitHub (para guardar y publicar el proyecto)

## 1. Instalar dependencias
```bash
npm install
```

## 2. Crear el proyecto de Supabase
1. Entrá en https://supabase.com y creá un proyecto.
2. Abrí **SQL Editor** y ejecutá el contenido de `supabase/schema.sql`.
3. En **Project Settings > API**, copiá Project URL y la clave `anon`/publishable.

## 3. Configurar variables
Copiá `.env.example` como `.env` y completá:
```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```
No subas el archivo `.env` a GitHub. Está excluido por `.gitignore`.

## 4. Ejecutar localmente
```bash
npm run dev
```
Vite mostrará una dirección local para abrir en el navegador.

## 5. Compilar
```bash
npm run build
```
La carpeta `dist` contiene el sitio listo para publicar.

## 6. Publicar
Podés importar el repositorio en Vercel o Netlify y configurar las mismas variables de entorno allí. Para Vercel, el comando de build es `npm run build` y el directorio de salida `dist`.

## 7. Instalar en el teléfono
Una vez publicado con HTTPS:
- Android: abrir el sitio en Chrome > menú > **Instalar aplicación** o **Agregar a pantalla principal**.
- iPhone: abrir en Safari > Compartir > **Agregar a pantalla de inicio**.

## Incluido en esta primera versión
- Registro e inicio de sesión con correo y contraseña (Supabase Auth).
- Datos sincronizados en la nube.
- Panel con totales, próximos pagos y vencidos.
- Alta de vencimientos con importe, fecha, categoría y notas.
- Marcar pagos como realizados y consultar historial.
- Diseño responsive blanco y naranja.
- Datos de demostración si todavía no se configuró Supabase.

## Importante: alcance de esta versión
- El recordatorio visual dentro de la app está preparado a nivel de interfaz, pero todavía no se envían notificaciones push ni correos automáticos.
- La carga de facturas por foto/OCR todavía no está implementada.
- El calendario mensual completo y los pagos recurrentes quedan para la siguiente etapa.
- El ejemplo usa ARS y fechas locales; antes de producción conviene ajustar zona horaria, formatos y reglas de negocio.
- Activá confirmación de correo en Supabase para producción y configurá las URLs permitidas de tu dominio.
- Nunca pongas una clave `service_role` en el frontend.
