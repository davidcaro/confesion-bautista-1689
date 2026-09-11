# Comprobaciones realizadas

- Compilación de producción con Next.js 16.3.3: correcta.
- Comprobación TypeScript incluida en la compilación: correcta.
- 32 capítulos presentes; contenido y preguntas conservados del proyecto original.
- Navegador: búsqueda «bautismo» devuelve cuatro capítulos; selección del capítulo 29 correcta; panel con cinco preguntas correcto; pantalla de moderación accesible.
- API de moderación: rechaza lectura y modificación sin sesión; también rechaza cabeceras de identidad de ChatGPT simuladas.
- API de notas: rechaza JSON inválido y solicitudes de otro origen.
- API bíblica: rechaza referencias inválidas.
- Auditoría de dependencias tras actualizar: cero vulnerabilidades reportadas por npm en esta comprobación.

Pendiente de comprobar en un proyecto Netlify configurado: inicio de sesión, invitación y recuperación con Identity; validación Turnstile; escritura persistente en Blobs; envío, aprobación y publicación de una nota; respuesta real del proveedor bíblico. No se ha publicado un proyecto Netlify ni migrado la base de datos anterior.
