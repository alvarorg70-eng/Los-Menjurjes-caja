# Los Menjurjes · Caja

Punto de venta para la Feria del Elote 2026. Una caja, efectivo y pesos mexicanos. App web instalable con funcionamiento sin conexión preparado mediante service worker y almacenamiento local IndexedDB.

**Sitio actual:** https://menjurjes-caja.alvarorg70.chatgpt.site

## Versión 3 · 16 de octubre de 2026

- Catálogo original de siete productos con fotografías y logotipos originales.
- Agregar productos con nombre, foto y precio. Aparecen automáticamente en Cobrar cuando están activos.
- Editar nombre, foto, precio y disponibilidad; desactivar sin borrar historial.
- Fotos nuevas guardadas como data URLs en IndexedDB; no dependen de servicios de imágenes.
- Pedidos, cobro en efectivo, cambio, historial, cancelaciones, apertura y corte, entradas y salidas.
- Exportación del catálogo o de toda la caja, con fotos incluidas. Importación de catálogo que conserva ventas y los demás productos.
- Restauración completa con confirmación escrita y copia local anterior para deshacer mientras no existan cambios posteriores.
- Borrar ventas de prueba SOLO de la caja abierta: conserva fondo, movimientos, catálogo y jornadas cerradas. Pide escribir BORRAR PRUEBAS y guarda una copia local para recuperar antes de nuevas ventas o cierre.

## Archivos

| Ruta | Función |
|---|---|
| `dist/index.html` | Pantallas, formularios y navegación |
| `dist/style.css` | Diseño adaptable para tabletas y móviles |
| `dist/app.js` | Interfaz, caja, cobro y almacenamiento local |
| `dist/catalog.js` | Validación, edición e importación del catálogo |
| `dist/reset-data.js` | Limpieza y recuperación de ventas de prueba |
| `dist/sw.js` | Caché sin conexión (`menjurjes-v4`) |
| `dist/assets/` | Siete fotografías y dos logotipos originales |
| `dist/manifest.webmanifest` | Instalación en pantalla de inicio |
| `tests/` | Pruebas automatizadas sin dependencias |
| `.openai/hosting.json` | Identidad/configuración del sitio original en Sites |

## Ejecutar y probar

No requiere compilación ni instalar dependencias. Con Node.js 18 o posterior:

```sh
npm test
npm run check
```

Para una vista local, sirve `dist` con un servidor estático; por ejemplo:

```sh
cd dist
python3 -m http.server 8000
```

Abre http://localhost:8000/ en el mismo ordenador. Abrir `index.html` como archivo local no verifica la instalación ni el service worker. Para iPad/Android se requiere HTTPS; `http://IP-local` no equivale a localhost en esos equipos.

## Datos existentes y compatibilidad

Se mantiene la base IndexedDB `menjurjes-caja`, versión de base 1, almacén `data`, registro `state`, con formato de estado versión 1. Los productos antiguos sin `active` permanecen activos. Los productos nuevos añaden `imageData` y `active`. Los respaldos antiguos siguen admitidos. Las ventas conservan su nombre y precio originales aunque cambie el catálogo.

**Este repositorio no contiene ventas, respaldos reales, cuentas, tokens ni credenciales.** Las ventas y los productos agregados en un equipo viven en su navegador. Exporta un JSON desde Productos y respaldo para respaldarlos. Cambiar dominio, navegador o equipo no transfiere esos datos automáticamente. No borres los datos del navegador al actualizar.

## Verificación

Pruebas automatizadas: alta/edición/desactivación, fotos en JSON, compatibilidad con respaldo antiguo, conservación de recibos, limpieza de ventas y recuperación. También se ejecutaron con un respaldo real proporcionado por el propietario, que no se incluye aquí. La prueba de service worker simula la red deshabilitada; no sustituye una prueba real en la tableta. La versión inicial fue comprobada por el propietario sin internet en iPhone/iPad. La versión 3 requiere todavía comprobar alta con foto, reapertura, exportación e importación en modo avión en el equipo de venta.

## Continuar en ChatGPT o Codex

Conecta GitHub y selecciona este repositorio, o descarga Code → Download ZIP y adjúntalo a un chat con capacidad de leer/editar archivos. Indica: “Continúa la app original, conserva IndexedDB, catálogo, recibos y operación sin internet; no reconstruyas desde cero”.

## Publicación

Este repositorio es una copia del código de la versión 3 publicada con Sites. Commit de origen en el repositorio interno de Sites: `339357cbae99249c6a6dd2bb768e112ff5e97f83`. Se conserva la identidad de Sites en `.openai/hosting.json` para continuar allí si se dispone de acceso. El repositorio de GitHub tiene su propio historial desde esta importación.

Los cambios en GitHub **no se publican automáticamente** en el enlace de Sites. Aún no se ha configurado despliegue automático ni migración a otro alojamiento. La carpeta pública para un alojamiento estático es `dist/`. Mantén el mismo origen para conservar acceso a los datos locales existentes; respalda antes de cualquier migración.
