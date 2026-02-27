# Tracking App

Aplicación web para rastreo y registro de recorridos mediante GPS utilizando Leaflet + OpenStreetMap.

## 📋 Descripción

Tracking App es una aplicación web que permite a los usuarios grabar recorridos mediante geolocalización GPS, visualizarlos en un mapa interactivo, guardarlos en almacenamiento local y exportarlos como archivos JSON. La aplicación utiliza Leaflet con OpenStreetMap para la visualización de mapas, implementando una arquitectura SOLID con principios de diseño moderno.

## 🚀 Características

### Core

- ✅ Grabación de recorridos en tiempo real con GPS
- ✅ Visualización de recorridos en mapa interactivo (OpenStreetMap)
- ✅ Cálculo automático de distancia recorrida
- ✅ Almacenamiento persistente en LocalStorage
- ✅ Exportación de recorridos a formato JSON
- ✅ Importación de recorridos desde archivos JSON
- ✅ Panel de gestión de recorridos guardados

### Estadísticas en Tiempo Real

- ✅ Tiempo transcurrido (formato HH:MM:SS)
- ✅ Velocidad actual (km/h)
- ✅ Distancia recorrida (metros/kilómetros)
- ✅ Número de puntos GPS capturados

### Control de Tracking

- ✅ **Pausar/Reanudar** grabación de recorrido
- ✅ Wake Lock para mantener pantalla activa
- ✅ Detección automática de app en segundo plano
- ✅ Notificaciones de estado

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
│   ├── __tests__/                   # Tests unitarios (83 tests)
│   ├── app.js                       # Bootstrap de la aplicación
│   ├── index.html                   # Dashboard de recorridos
│   ├── track.html                   # Página de tracking
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

## 🧪 Testing

```bash
bun test           # Ejecutar tests
bun test --watch   # Watch mode
```

**Estado actual**: 83 tests pasando ✅

## 🎮 Controles

### Durante Tracking

| Botón        | Acción                           |
| ------------ | -------------------------------- |
| **Iniciar**  | Comienza grabación GPS           |
| **Pausar**   | Pausa grabación (GPS se detiene) |
| **Reanudar** | Continúa grabación               |
| **Terminar** | Detiene grabación                |
| **Guardar**  | Persiste en LocalStorage         |
| **Exportar** | Descarga JSON                    |

## 📱 Compatibilidad

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+
- ✅ Dispositivos móviles (responsive)

## 🔮 Roadmap

- [ ] PWA + Soporte offline
- [ ] Exportación a GPX
- [ ] Configuración de unidades (km/millas)
- [ ] Eliminar recorridos individuales

## 📄 Licencia

MIT

## 👤 Autor

**jarp** - [jrodrigopuca](https://github.com/jrodrigopuca)
