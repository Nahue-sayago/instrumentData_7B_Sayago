# Pulso: inventario de instrumentos

Aplicación CRUD para registrar el nombre de la persona responsable, instrumento, número de parte, número de serie y fotografía. La interfaz usa Next.js; los datos se guardan en Postgres y las fotos en Vercel Blob.

## Desarrollo local

1. Instala Node.js 18.18 o superior y ejecuta `npm install`.
2. Copia `.env.example` a `.env.local` y define `POSTGRES_URL` y `BLOB_READ_WRITE_TOKEN` con credenciales válidas.
3. Ejecuta `npm run dev` y abre `http://localhost:3000`.

La tabla `instruments` se crea automáticamente al consultar el inventario por primera vez. Las imágenes aceptadas son de hasta 5 MB.

## Despliegue en Vercel

1. Importa este repositorio en Vercel.
2. Desde el Marketplace de Vercel, conecta una base de datos Neon y agrega la variable `POSTGRES_URL` al proyecto. También se admite `DATABASE_URL`.
3. Crea un almacén de Vercel Blob y agrega `BLOB_READ_WRITE_TOKEN` a las variables de entorno.
4. Despliega de nuevo después de configurar las variables.

Los almacenes y variables de producción y preview se configuran por separado en Vercel. Las fotos se guardan como blobs públicos para que puedan mostrarse en el inventario.

## Acceso

Esta primera versión no incluye autenticación: cualquier persona con acceso a la URL puede consultar y modificar el inventario. Protege el despliegue con Vercel Deployment Protection o incorpora inicio de sesión antes de usarlo con datos reales. Las fotografías de Vercel Blob también son públicas.