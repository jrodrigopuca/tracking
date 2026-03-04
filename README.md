# Tracking App

Aplicación web para rastreo y registro de recorridos mediante GPS utilizando Leaflet + OpenStreetMap.

## 📋 Descripción

Tracking App es una aplicación web que permite a los usuarios grabar recorridos con GPS o modo simulado, visualizarlos en un mapa interactivo, guardarlos en almacenamiento local, reanudarlos más tarde y exportarlos en múltiples formatos (JSON, GPX, KML, deep links). Usa Leaflet + OpenStreetMap y una arquitectura modular (EventBus + SRP).

## 🚀 Características

### Core

- ✅ Grabación de recorridos en tiempo real con GPS
- ✅ Visualización de recorridos en mapa interactivo (OpenStreetMap)
- ✅ Cálculo automático de distancia recorrida
- ✅ Almacenamiento persistente en LocalStorage
- ✅ Importación de recorridos desde archivos JSON
- ✅ Panel de gestión de recorridos guardados
- ✅ Reanudación de recorridos pendientes (auto-guardado en background)

### Exportación Múltiple

- ✅ **JSON** - Formato nativo para importar/exportar
- ✅ **GPX** - Compatible con Strava, Garmin, apps de fitness
- ✅ **KML** - Compatible con Google Earth
- ✅ **Google Maps** - Abrir ruta directamente en Google Maps
- ✅ **Apple Maps** - Abrir ruta directamente en Apple Maps
- ✅ **Web Share API** - Compartir archivos GPX en dispositivos móviles

### Estadísticas en Tiempo Real

- ✅ Tiempo transcurrido (formato HH:MM:SS)
- ✅ Velocidad actual (km/h)
- ✅ Distancia recorrida (metros/kilómetros)
- ✅ Número de puntos GPS capturados
- ✅ Reproducción de rutas guardadas (playback y reversa)

### Control de Tracking

- ✅ **Pausar/Reanudar** grabación de recorrido
- ✅ Wake Lock para mantener pantalla activa
- ✅ Detección automática de app en segundo plano
- ✅ Notificaciones de estado
- ✅ Indicadores de red, GPS (precisión) y batería
- ✅ Brújula con orientación del dispositivo y dirección de movimiento

### Marcadores Visuales

- 🟢 **Marcador de inicio** (verde)
- 🔴 **Marcador de fin** (rojo)
- 🔵 **Posición actual** (azul con animación de pulso)
- 🟣 **Ubicación del usuario** (morado)

### Modo Simulación

- ✅ Simulador GPS para pruebas (`?simulate=true`)
- ✅ 15 ciudades aleatorias preconfiguradas
- ✅ Velocidad y dirección configurable

## 🏗️ Arquitectura

### Principios SOLID Implementados

- **S**ingle Responsibility: Cada servicio tiene una única responsabilidad
- **O**pen/Closed: Extensible mediante EventBus sin modificar código existente
- **L**iskov Substitution: Servicios intercambiables (ej: GeoSimulator por GeoLocationService)
- **I**nterface Segregation: Interfaces específicas por dominio
- **D**ependency Inversion: Inyección de dependencias en UIController

### Estructura de Archivos

```
tracking/
├── src/
│   ├── core/                    # Servicios core
│   │   ├── DistanceCalculator.js    # Cálculo de distancias (Haversine)
│   │   ├── EventBus.js              # Sistema de eventos pub/sub
│   │   ├── ExportService.js         # Exportación GPX/KML/Deep Links
│   │   ├── GeoLocationService.js    # Wrapper Geolocation API
│   │   ├── GeoSimulator.js          # Simulador GPS para testing
│   │   ├── MapService.js            # Wrapper Leaflet/OpenStreetMap
│   │   ├── StorageService.js        # Wrapper LocalStorage
│   │   └── WakeLockService.js       # Mantiene pantalla activa
│   ├── models/
│   │   └── Route.js                 # Modelo de datos de ruta
│   ├── ui/
│   │   ├── UIController.js          # Controlador principal de UI
│   │   └── Notifications.js         # Sistema de notificaciones toast
│   ├── __tests__/                   # Tests unitarios (152 tests)
│   ├── app.js                       # Bootstrap de la aplicación
│   ├── index.html                   # Dashboard de recorridos
│   ├── track.html                   # Página de tracking
│   ├── route-detail.html            # Detalle con replay/export/delete
│   └── styles.css                   # Estilos globales
├── docs/                            # Documentación
├── package.json
└── bun.lockb
```

### Patrón EventBus

```javascript
// Eventos disponibles
EventBus.emit("tracking:started", route);
EventBus.emit("tracking:stopped", route);
EventBus.emit("tracking:paused");
EventBus.emit("tracking:resumed");
EventBus.emit("position:updated", { position, route });
EventBus.emit("route:saved", route);
```

## 🔧 Tecnologías

| Categoría      | Tecnología                    |
| -------------- | ----------------------------- |
| **Mapas**      | Leaflet 1.9.4 + OpenStreetMap |
| **Frontend**   | HTML5, CSS3, JavaScript ES6+  |
| **Build Tool** | Parcel 2.12.0                 |
| **Runtime**    | Bun                           |
| **Testing**    | Vitest + happy-dom            |

## 📦 Instalación

```bash
bun install
bun start
# Abrir http://localhost:1234
```

## 🌐 URLs de Desarrollo

| URL                                              | Descripción            |
| ------------------------------------------------ | ---------------------- |
| `http://localhost:1234`                          | Dashboard principal    |
| `http://localhost:1234/track.html`               | Nuevo recorrido        |
| `http://localhost:1234/track.html?id=ID`         | Ver recorrido guardado |
| `http://localhost:1234/track.html?simulate=true` | Modo simulación GPS    |
| `http://localhost:1234/route-detail.html?id=ID`  | Detalle y replay       |

## 🧪 Testing

```bash
bun test           # Ejecutar tests
bun test --watch   # Watch mode
```

**Estado actual**: 152 tests pasando ✅

## 🎮 Controles

### Durante Tracking

| Botón          | Acción                           |
| -------------- | -------------------------------- |
| **Iniciar**    | Comienza grabación GPS           |
| **Pausar**     | Pausa grabación (GPS se detiene) |
| **Reanudar**   | Continúa grabación               |
| **Terminar**   | Detiene grabación                |
| **Guardar**    | Persiste en LocalStorage         |
| **Exportar ▼** | Menú desplegable de exportación  |
| → GPX          | Descarga archivo GPX             |
| → KML          | Descarga archivo KML             |
| → Google Maps  | Abre ruta en Google Maps         |
| → Apple Maps   | Abre ruta en Apple Maps          |
| → Compartir    | Comparte vía Web Share (móvil)   |

## 📱 Compatibilidad

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+
- ✅ Dispositivos móviles (responsive)

## 🔮 Roadmap

- [ ] PWA + Soporte offline
- [ ] Configuración de unidades (km/millas)
- [ ] Eliminar recorridos individuales
- [ ] Importar archivos GPX

## 📄 Licencia

MIT

## 👤 Autor

**jarp** - [jrodrigopuca](https://github.com/jrodrigopuca)
