# Arquitectura del Sistema - Tracking App

## 📐 Visión General

Tracking App es una SPA client-side que usa Leaflet + OpenStreetMap para mostrar mapas y la Geolocation API del navegador para capturar recorridos. La aplicación está modularizada en servicios pequeños (SRP) conectados por un EventBus y orquestados por `app.js`.

## 🏛️ Arquitectura de Alto Nivel

```
┌──────────────────────────────────────────────────────────────┐
│                          NAVEGADOR                          │
│  ┌───────────────────────────┬─────────────────────────────┐ │
│  │   Páginas (UI)            │   Core Services             │ │
│  │   - index.html            │   - MapService (Leaflet)    │ │
│  │   - track.html            │   - GeoLocationService      │ │
│  │   - route-detail.html     │   - GeoSimulator            │ │
│  │                           │   - StorageService          │ │
│  │   app.js crea UIController│   - ExportService           │ │
│  │   e inyecta dependencias │   - WakeLockService         │ │
│  └───────────────┬───────────┴───────────┬────────────────┘ │
│                  │ EventBus (pub/sub)    │                   │
│                  └──────────────┬────────┘                   │
│                                 │                            │
│      ┌──────────────────────────▼─────────────────────────┐  │
│      │ APIs del navegador / terceros                     │  │
│      │ - Geolocation     - DeviceOrientation (brújula)   │  │
│      │ - Wake Lock       - Battery / Network info        │  │
│      │ - Fullscreen      - Web Share                     │  │
│      │ - Leaflet + OSM tiles (CDN)                       │  │
│      └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 📦 Módulos y Responsabilidades

### 1. Capa de Presentación

- [src/index.html](src/index.html) — Dashboard
  - Lista y estadísticas de recorridos (`tracking_routes`)
  - Importación JSON (valida estructura y crea `Route`)
  - Banner para reanudar recorridos pendientes (`tracking_pending_route`)
  - Acciones rápidas: exportar JSON, eliminar ruta

- [src/track.html](src/track.html) — Tracking en vivo
  - Mapa Leaflet a pantalla completa
  - Controles: iniciar/pausar/reanudar/finalizar, guardar, exportar (GPX/KML/Google/Apple), compartir (Web Share)
  - Indicadores de red, GPS (precisión), batería, brújula y dirección de movimiento
  - Waypoints marcables durante la grabación
  - Modo simulación (`?simulate=true`) con rutas realistas
  - Fullscreen y Wake Lock mientras se graba

- [src/route-detail.html](src/route-detail.html) — Visor de rutas guardadas
  - Renderiza polilínea, marcadores de inicio/fin/waypoints
  - Reproducción animada con inversión de dirección
  - Exportar/compartir ruta y eliminar desde la vista de detalle
  - Overlay opcional de ubicación del usuario

### 2. Capa de Lógica

- [src/app.js](src/app.js) — Punto de entrada; compone servicios, inicializa UIController y listeners globales (foreground/background, wake lock).
- [src/ui/UIController.js](src/ui/UIController.js) — Orquesta UI/servicios en track.html: controla botones, métricas, timers, waypoints, estado pendiente, batería, brújula y exportaciones.
- [src/ui/Notifications.js](src/ui/Notifications.js) — Toasts no bloqueantes.
- [src/core/MapService.js](src/core/MapService.js) — Wrapper Leaflet (markers diferenciados, polilíneas, fitBounds, zoom, limpieza).
- [src/core/GeoLocationService.js](src/core/GeoLocationService.js) — Wrapper Geolocation (start/stop, opciones, eventos de error).
- [src/core/GeoSimulator.js](src/core/GeoSimulator.js) — Simulador de GPS con ritmos dinámicos y ciudades predefinidas.
- [src/core/StorageService.js](src/core/StorageService.js) — CRUD localStorage + import/export JSON + eventos.
- [src/core/ExportService.js](src/core/ExportService.js) — GPX, KML, deep links Google/Apple Maps y Web Share.
- [src/core/WakeLockService.js](src/core/WakeLockService.js) — Mantiene pantalla activa y detecta background/foreground.
- [src/core/EventBus.js](src/core/EventBus.js) — Pub/Sub central.
- [src/models/Route.js](src/models/Route.js) — Modelo de ruta: puntos, waypoints, distancia, velocidades, serialización.

### 3. Capa de Datos

- Persistencia principal: `localStorage`
  - `tracking_routes`: `RouteData[]`
    - `id: string`, `name: string`, `createdAt: ISO`, `points: {lat,lng,timestamp}[]`, `waypoints: {id,lat,lng,name,timestamp}[]`, `distance: km`, `duration: ms`, `averageSpeed: km/h`
  - `tracking_pending_route`: estado temporal para reanudar (nombre, puntos, waypoints, elapsedTime, savedAt)

Flujo de datos resumido:

1. Geolocation/GeoSimulator emite posiciones → EventBus `location:updated`
2. UIController agrega puntos a `Route`, actualiza polyline/markers/estadísticas
3. Usuario guarda → `StorageService.save` persiste en `tracking_routes`
4. Exportaciones generan archivos (GPX/KML/JSON) o enlaces (Google/Apple) o Web Share
5. Rutas pendientes se auto-guardan y reanudan vía parámetro `resume=true`

### 4. APIs y dependencias externas

- Geolocation API con `enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 10000` (ajustado en modo ahorro de batería).
- Leaflet 1.9.4 + OpenStreetMap tiles (CDN).
- DeviceOrientation (brújula) con fallback y permiso explícito en iOS.
- Screen Wake Lock (opcional; se degrada en navegadores sin soporte).
- Battery Status (cuando está disponible) para modo ahorro.
- Web Share API (cuando está disponible) y Fullscreen API.

## 🔄 Flujos de Usuario

1. **Nuevo recorrido**
   - `index.html` → botón + → `track.html`
   - Iniciar → agrega puntos (GPS o simulador), muestra stats, marca inicio/actual, waypoints opcionales
   - Pausar/Reanudar según sea necesario
   - Finalizar → Guardar (localStorage) y opcionalmente exportar/compartir

2. **Reanudar recorrido pendiente**
   - `index.html` detecta `tracking_pending_route` y ofrece continuar
   - `track.html?resume=true` restaura puntos, waypoints y tiempo acumulado, reactiva tracking

3. **Ver recorrido guardado**
   - `route-detail.html?id=...` carga desde `tracking_routes`
   - Muestra polilínea, inicio/fin/waypoints, métricas, replay y exportar/compartir/eliminar

4. **Importar recorrido**
   - `index.html` → input file (.json)
   - Valida estructura de puntos, crea `Route`, persiste en `tracking_routes`

5. **Exportar/Compartir**
   - En vivo: GPX/KML/Google/Apple/Share desde `track.html`
   - Guardadas: exportar/compartir desde `route-detail.html` (GPX/KML/Share)

## 🧩 Patrones y decisiones

- SRP + SOLID en servicios pequeños; UIController orquesta.
- Dependency Injection desde `app.js` (map, geo, storage, wake lock).
- Event-driven con `EventBus` para desac acoplar GPS/UI/almacenamiento.
- LocalStorage por simplicidad y uso offline ligero; sin backend.
- Leaflet + OSM para evitar API keys y reducir lock-in.

## 🚀 Escalabilidad / Limitaciones actuales

- LocalStorage (~5–10 MB) limita rutas largas; sin paginación ni compresión.
- Polilíneas muy densas pueden afectar render y memoria en dispositivos modestos.
- Sin Service Worker/PWA: requiere red para tiles y no hay cache de assets.
- Web Share, Wake Lock, Battery y DeviceOrientation dependen del navegador (especialmente en iOS/Firefox).

### Propuestas para Escalar

#### Corto Plazo

- Implementar límite máximo de rutas guardadas
- Agregar simplificación de polylines (Douglas-Peucker)
- Lazy loading de rutas en dashboard

#### Mediano Plazo

- Migrar a IndexedDB
- Implementar Web Workers para cálculos pesados
- Virtualización de lista de rutas

#### Largo Plazo

- Backend con base de datos
- Sync multi-dispositivo
- Compresión de datos
- CDN para assets estáticos

---

## 🔒 Seguridad

### Vulnerabilidades Actuales

1. **Importación JSON sin esquema**: no se valida estructura/tamaño antes de guardar en localStorage
2. **XSS potencial**: uso puntual de `innerHTML` y datos de rutas/waypoints sin sanitizar
3. **Recursos de terceros por CDN**: Leaflet/OSM sin Content Security Policy explícita
4. **Sin controles de cuota**: no hay límites de tamaño/longitud de rutas al importar o guardar

### Mitigaciones Recomendadas

1. **Validar esquema** de rutas/waypoints previo a persistir (p.ej., AJV + límites de longitud)
2. **Escapar/sanitizar** textos de usuario y sustituir `innerHTML` por `textContent`
3. **Definir CSP** y listar solo CDNs necesarios; considerar empaquetar assets críticos
4. **Aplicar límites** de puntos/waypoints y tamaño de archivos de importación

---

## 📚 Referencias

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Geolocation API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [LocalStorage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Parcel Documentation](https://parceljs.org/)
