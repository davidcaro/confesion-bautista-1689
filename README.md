# Confesión Bautista de 1689 — versión Netlify

Proyecto completo en español, adaptado desde la versión 7 de Sites. Conserva la lectura de los 32 capítulos, búsqueda, temas, ajustes de lectura, referencias NBLA, preguntas de estudio y notas con moderación.

## Publicar en Netlify

1. Descomprime el ZIP y sube el contenido de esta carpeta a un repositorio de GitHub, GitLab o Bitbucket. `package.json` y `netlify.toml` deben quedar en la raíz.
2. En Netlify selecciona **Add new project → Import an existing project** y conecta ese repositorio.
3. Usa **Node 22**, comando **npm run build** y carpeta de publicación **.next**. La configuración ya está incluida en `netlify.toml`.
4. Publica el proyecto. Netlify adapta automáticamente las páginas y las rutas del servidor.

Este ZIP contiene código fuente: no es un paquete HTML para arrastrar a Netlify Drop. Las consultas bíblicas, notas y moderación necesitan las funciones de servidor incluidas.

Alternativa desde la terminal, dentro de esta carpeta:

```sh
npm ci
npx netlify login
npx netlify init
npx netlify deploy --build --prod
```

## Activar notas y moderación

En la configuración del proyecto de Netlify, agrega estas variables para el entorno de producción, disponibles en Functions:

| Variable | Valor |
| --- | --- |
| `ADMIN_EMAIL` | Correo de la única cuenta autorizada para moderar |
| `NOTE_HASH_SALT` | Una cadena aleatoria larga y privada; no cambiar entre despliegues |
| `TURNSTILE_SITE_KEY` | Clave pública del widget Turnstile |
| `TURNSTILE_SECRET_KEY` | Clave secreta del mismo widget |

Puedes generar el valor de `NOTE_HASH_SALT` localmente con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

En Cloudflare Turnstile crea un widget y autoriza el dominio real de Netlify y el dominio personalizado, si lo usas. No uses las claves de prueba en producción. Turnstile es solo la verificación antispam; el alojamiento y las notas funcionan en Netlify.

En **Project configuration → Identity** activa Identity, configura el registro **Invite only** e invita el correo establecido en `ADMIN_EMAIL`. Abre el enlace de invitación para definir tu contraseña. La aplicación maneja invitaciones y recuperación de contraseña incluso si el enlace llega a la página principal. La moderación está en **/moderacion** y dispone de cierre de sesión.

Vuelve a desplegar después de guardar la configuración. Netlify Blobs crea automáticamente el almacén privado `confesion-study-notes`; las notas persisten entre despliegues del mismo proyecto. Los visitantes solo reciben notas aprobadas, sin correos ni identificadores de antispam. Las nuevas notas esperan aprobación y mantienen el límite de tres envíos por hora por correo o IP.

## Datos de Sites

El contenido de los capítulos y las preguntas está incluido. Las notas que ya existan en la base de datos de Sites **no están incluidas ni migradas**. El nuevo almacén comienza vacío. El sitio original permanece intacto. El acceso del moderador se realiza con Netlify Identity, ya no con la sesión de ChatGPT.

La implementación de notas está pensada para una comunidad pequeña: enumera el almacén para filtrar notas y el límite de envíos es aproximado ante solicitudes simultáneas. Para grandes volúmenes conviene una base de datos con consultas indexadas y límites atómicos.

## Desarrollo y comprobación

```sh
npm ci
npm run build
npm run start
```

Para desarrollo: `npm run dev`. La lectura funciona localmente. Blobs necesita el entorno de Netlify (`netlify dev` o un despliegue); el acceso Identity y Turnstile deben comprobarse en un despliegue configurado.

Antes de dar por terminada la publicación, prueba una búsqueda, cambia de capítulo, abre una referencia bíblica, envía una nota de prueba, apruébala desde `/moderacion` y comprueba su aparición pública. Las referencias bíblicas conservan la consulta a Bible Gateway del proyecto original; su disponibilidad depende de ese servicio externo.

Fuentes de configuración: [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [despliegue desde repositorio](https://docs.netlify.com/start/quickstarts/deploy-from-repository/).
