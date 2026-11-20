**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

## Optimización de la carga de noticias

El frontend usa la API Express de `server/` y MySQL, no el cliente Base44.

### Despliegue

1. Con las migraciones 001–004 ya aplicadas, ejecutar **una sola vez**
   [005_article_loading.sql](server/migrations/005_article_loading.sql) en la base de datos del sitio,
   desde phpMyAdmin o el cliente MySQL. Aplicarla **antes** de activar el nuevo backend:
   la búsqueda necesita el índice FULLTEXT que incluye `body`. No elimina artículos ni modifica su contenido.
   Si se han creado índices manualmente, comprobar sus nombres con `SHOW INDEX FROM articles` antes de ejecutar el archivo.
2. Usar Node.js 22 e instalar las dependencias con `npm ci` (incluye `sharp` para las miniaturas).
3. Ejecutar `npm test`, `npm run lint`, `npm run typecheck` y `npm run build`.
4. Desplegar juntos el backend y `dist/`, y reiniciar el proceso Node/Passenger.
5. Comprobar portada, búsqueda, categorías, acceso al panel y edición de una noticia antigua.

La migración no se ejecuta automáticamente al iniciar el servidor.
Para comprobar el uso de los índices en esa base:

```sql
EXPLAIN SELECT id, title FROM articles
WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT 27;

EXPLAIN SELECT id, title FROM articles
WHERE status = 'published' AND category = 'seguridad'
ORDER BY published_at DESC, id DESC LIMIT 25;

EXPLAIN SELECT id FROM articles
WHERE status = 'published'
AND MATCH(title, excerpt, body) AGAINST ('+Juárez*' IN BOOLEAN MODE);
```

### Contrato de lectura

- `GET /api/articles/home`: portada, hero vigente (incluso antiguo) y hasta cinco resúmenes por categoría.
- `GET /api/articles?page=1&limit=24`: `{ items, page, pageSize, hasMore }`.
  Soporta `category`, `tag`, `search`, `exclude` y `sort`. El máximo por página es 100;
  los parámetros inválidos usan valores seguros. Siempre devuelve únicamente publicaciones,
  incluso si se envía `status=draft` o un token administrativo.
- `GET /api/articles/:slug`: detalle completo publicado; admite también el ID.
- `GET /api/admin/articles`: listado autenticado con los mismos filtros, `status` y `total`.
- `GET /api/admin/articles/:id`: detalle completo autenticado para el editor.
- `GET /api/admin/articles/stats` y `/tags`: estadísticas y etiquetas de todo el archivo.

Los listados ya no devuelven `body` y la respuesta paginada sustituye al antiguo array.
Cualquier consumidor externo de `/api/articles` debe adaptarse a `items` o al endpoint de detalle.
La búsqueda usa prefijos por palabra sobre título, resumen y cuerpo, con las reglas de
tokenización y stopwords del motor FULLTEXT de MySQL/MariaDB.

### Imágenes y caché

Las tarjetas y el detalle solicitan WebP de 160, 480, 800 o 1280 píxeles mediante `srcSet` y `sizes`.
`GET /api/images/:articleId/:width.webp` solo procesa portadas de noticias publicadas,
incluyendo archivos existentes de `/uploads/` e imágenes HTTP(S) externas.
La primera solicitud genera la miniatura; las siguientes reutilizan el archivo en
`server/image-cache/` y la caché del navegador durante un día. La carpeta se crea automáticamente
y debe ser escribible por Node. Se puede borrar su contenido para regenerar las miniaturas.
El original se conserva y se usa automáticamente si falla la optimización.

La descarga externa tiene límite de 8 MB, tiempo de espera de 8 segundos y hasta tres redirecciones;
se bloquean destinos de redes privadas y se limita el tamaño de imagen decodificada.
No se agrandan imágenes pequeñas. Los errores no se cachean.

Las consultas del navegador se consideran recientes durante 30 segundos. Guardar o eliminar
una noticia invalida todas sus vistas públicas y administrativas. El código y CSS del editor
se descargan únicamente al entrar en esa ruta.

Las pruebas de API usan MySQL simulado; no sustituyen la aplicación de la migración ni `EXPLAIN`
en la base real. Las pruebas de imágenes sí generan y verifican WebP con `sharp`.

## Panel editorial y cabecera de Última hora

1. Aplicar [006_ticker_schedule.sql](server/migrations/006_ticker_schedule.sql) una vez en la base de datos, después de las migraciones 001–005 y antes de reiniciar el nuevo backend.
2. Desplegar el backend y `dist/` juntos. Verificar `/admin/ticker` con una cuenta editorial y la banda de Última hora del sitio público.

El panel permite habilitar, pausar y ordenar titulares. El inicio vacío permite que el titular aparezca al habilitarlo. El fin vacío lo mantiene sin vencimiento. Se pueden elegir fechas o aplicar atajos de 1, 6 y 24 horas. El formulario usa la zona horaria del dispositivo y la base guarda UTC. Las entradas existentes conservan su orden y estado, con vigencia indefinida.

La cabecera muestra hasta 30 titulares en orden. Una página pública abierta consulta el servidor cada 15 segundos y retira los titulares cargados al llegar su hora de fin. Cuando un titular se enlaza desde el selector de noticias, sigue la URL de esa publicación y se oculta si se retira o elimina la noticia. En el editor de noticias, «Mostrar hasta» controla el vencimiento del destaque en portada.
