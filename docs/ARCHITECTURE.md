# Arquitectura del Sistema - Tracking App

## 📐 Visión General

Tracking App es una Single Page Application (SPA) client-side que utiliza tecnologías web estándar para proporcionar funcionalidad de tracking GPS.

## 🏛️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────┐
│                   NAVEGADOR                          │
│  ┌───────────────────────────────────────────────┐  │
│  │          interface de Usuario                 │  │
│  │  ┌──────────────┐    ┌──────────────┐        │  │
│  │  │ index.html   │    │ track.html   │        │  │
│  │  │  (Dashboard) │    │  (Tracking)  │        │  │
│  │  └──────┬───────┘    └──────┬───────┘        │  │
│  │         │                    │                │  │
│  │         └────────┬───────────┘                │  │
│  │                  │                            │  │
│  │         ┌────────▼────────┐                   │  │
│  │         │    track.js     │                   │  │
│  │         │  (Controller)   │                   │  │
│  │         └────────┬────────┘                   │  │
│  │                  │                            │  │
│  └──────────────────┼────────────────────────────┘  │
│                     │                               │
│  ┌──────────────────┼────────────────────────────┐  │
│  │                  │        APIs                │  │
│  │    ┌─────────────┼─────────────┐              │  │
│  │    │             │             │              │  │
│  │  ┌─▼──────┐  ┌──▼───────┐  ┌─▼────────┐      │  │
│  │  │Geoloc. │  │LocalStg  │  │HERE Maps │      │  │
│  │  │  API   │  │   API    │  │   API    │      │  │
│  │  └────────┘  └──────────┘  └──────────┘      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 📦 Módulos y Responsabilidades

### 1. Capa de Presentación

#### [index.html](src/index.html) - Dashboard
**Responsabilidad**: Gestión y visualización de recorridos guardados

**Funcionalidades**:
- Renderizado de lista de rutas desde localStorage
- Navegación a vista de tracking
- Importación de archivos JSON
- Link a vista detallada de cada ruta

**Dependencias**:
- [styles.css](src/styles.css)
- LocalStorage API
- DOM API

#### [track.html](src/track.html) - Vista de Tracking
**Responsabilidad**: Interfaz para grabación y visualización de recorridos

**Funcionalidades**:
- Contenedor del mapa HERE
- Botones de control de tracking
- Display de información en tiempo real
- Lista de puntos capturados

**Dependencias**:
- HERE Maps SDK v3.1
- [track.js](src/track.js)
- [styles.css](src/styles.css)

### 2. Capa de Lógica

#### [track.js](src/track.js) - Controlador Principal
**Responsabilidad**: Lógica central de la aplicación

**Componentes**:

##### Inicialización
```javascript
initConditions()
├── Crea H.service.Platform con API key
├── Configura capas de mapa por defecto
├── Crea instancia H.Map
└── Habilita comportamientos de interacción
```

##### Sistema de Tracking
```javascript
startTracking()
├── watchPosition() activo
├── Captura coordenadas GPS
├── Aplica filtros temporales (10 seg)
├── Valida puntos únicos
├── Actualiza path array
├── Renderiza markers
├── Actualiza polyline
└── Calcula distancia
```

##### Gestión de Estado
- **Variables globales**:
  - `watchLocation`: ID del watcher de geolocalización
  - `map`: Instancia del mapa HERE
  - `platform`: Plataforma HERE Maps
  - `path`: Array de coordenadas capturadas
  - `distance`: Distancia acumulada en metros
  - `polyline`: Referencia a polyline del mapa
  - `lastAddedPointTime`: Timestamp del último punto

##### Funciones Utilitarias

```javascript
// Cálculo geodésico (Haversine)
calculateDistance(lat1, lon1, lat2, lon2)
  └── Retorna distancia en metros

// Actualización visual
updateDistance(pos)
  ├── Calcula distancia incremental
  ├── Actualiza polyline en mapa
  └── Actualiza UI con info

// Persistencia
savePath()
  ├── Lee routes desde localStorage
  ├── Crea objeto route con timestamp ID
  └── Guarda en localStorage

// Exportación
exportPath()
  ├── Serializa path a JSON
  ├── Crea Blob descargable
  └── Trigger download en navegador
```

#### [route.js](src/route.js) - Clase Route (NO UTILIZADO)
**Estado**: Refactorización incompleta

**Intención original**: Encapsular lógica de tracking en clase reutilizable

**Contenido**:
- Clase `Route` con métodos similares a track.js
- Constructor con inicialización de mapa
- Métodos parcialmente implementados
- **Problema**: Nunca se importa ni se utiliza

---

### 3. Capa de Datos

#### LocalStorage Schema

```typescript
// Tipo: Array<Route>
interface Route {
  name: string;        // "Route-{timestamp}" o "Imported-{timestamp}"
  id: number;          // Date.now() timestamp
  distance: number;    // metros recorridos
  path: Position[];    // array de coordenadas
}

interface Position {
  lat: number;         // latitud
  lng: number;         // longitud
}
```

**Key**: `"routes"`
**Acceso**: 
- Lectura: `JSON.parse(localStorage.getItem("routes")) || []`
- Escritura: `localStorage.setItem("routes", JSON.stringify(routes))`

#### Flujo de Datos

```
[Captura GPS] → Geolocation API
      ↓
[Filtrado] → Validación temporal + unicidad
      ↓
[Estado Local] → path array + distance variable
      ↓
[Persistencia] → localStorage (on demand)
      ↓
[Exportación] → JSON file download
```

---

### 4. Capa de APIs Externas

#### Geolocation API
```javascript
navigator.geolocation.watchPosition(
  successCallback,  // Recibe GeolocationPosition
  errorCallback,    // ⚠️ NO IMPLEMENTADO
  options           // ⚠️ NO CONFIGURADO
)
```

**Configuración actual**: Valores por defecto del navegador
**Sugerencia**: Agregar opciones:
```javascript
{
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
}
```

#### HERE Maps API v3.1

**Módulos utilizados**:
- `mapsjs-core.js`: Core del mapa
- `mapsjs-service.js`: Servicios de plataforma
- `mapsjs-ui.js`: Elementos de UI (no utilizado actualmente)
- `mapsjs-mapevents.js`: Manejo de eventos

**Objetos principales**:
```javascript
H.service.Platform        // Plataforma con API key
H.Map                     // Instancia del mapa
H.map.Marker              // Marcadores de puntos
H.map.Polyline            // Líneas de ruta
H.geo.LineString          // Geometría de línea
H.geo.Point               // Punto geográfico
H.mapevents.Behavior      // Comportamientos (pan, zoom)
H.mapevents.MapEvents     // Eventos del mapa
```

---

## 🔄 Flujos de Usuario

### Flujo 1: Crear Nuevo Recorrido

```
[index.html] Usuario hace clic en "Agregar Recorrido"
      ↓
[track.html] Carga con mapa centrado en coordenadas default
      ↓
Usuario hace clic en "Iniciar"
      ↓
[track.js:startTracking()] Inicia watchPosition
      ↓
Cada 10+ segundos: Captura coordenada única
      ↓
[track.js:updateDistance()] Actualiza distancia y polyline
      ↓
[track.js:updateList()] Agrega a lista visible
      ↓
Usuario hace clic en "Terminar"
      ↓
[track.js:stopTracking()] Detiene watchPosition
      ↓
Usuario hace clic en "Guardar recorrido"
      ↓
[track.js:savePath()] Persiste en localStorage
      ↓
Usuario hace clic en "Volver"
      ↓
[index.html] Dashboard actualizado con nuevo recorrido
```

### Flujo 2: Ver Recorrido Guardado

```
[index.html] Usuario hace clic en "Ver" de un recorrido
      ↓
[track.html?id=123456] Carga con parámetro ID
      ↓
[track.js:checkParamId()] Lee ID de URL params
      ↓
Busca route en localStorage por ID
      ↓
Carga path y distance del route
      ↓
Renderiza polyline completa en mapa
      ↓
Centra mapa en primer punto del path
```

### Flujo 3: Importar Recorrido

```
[index.html] Usuario selecciona archivo JSON
      ↓
[index.html:addNewRouteByFile()] Trigger change event
      ↓
FileReader lee contenido del archivo
      ↓
JSON.parse() del contenido
      ↓
Crea route object con path importado
      ↓
Agrega a array de routes en localStorage
      ↓
[index.html:loadRoutes()] Refresca lista
```

### Flujo 4: Exportar Recorrido

```
[track.html] Usuario hace clic en "Exportar"
      ↓
[track.js:exportPath()] Serializa path actual
      ↓
Crea Blob con JSON del path
      ↓
Crea URL temporal del Blob
      ↓
Crea elemento <a> con download attribute
      ↓
Trigger click programático
      ↓
Navegador descarga "recorrido.json"
      ↓
Cleanup: Revoca URL del Blob
```

---

## 🧩 Patrones de Diseño

### Patrones Utilizados

#### 1. Module Pattern (Implícito)
Cada archivo JS actúa como módulo independiente con scope propio (gracias a ES modules).

#### 2. Event-Driven Architecture
Toda la interacción se basa en event listeners:
```javascript
document.getElementById("start-button").addEventListener("click", startTracking);
```

#### 3. Observer Pattern
Uso de `watchPosition()` que notifica cambios de posición.

### Anti-patrones Presentes

#### 1. God Object
`track.js` maneja demasiadas responsabilidades:
- UI updates
- Geolocation
- Map rendering
- Data persistence
- Export/Import

**Solución**: Separar en módulos especializados.

#### 2. Global Variables
Variables globales en scope del módulo:
```javascript
let watchLocation = null;
let map;
let platform;
// ...
```

**Solución**: Encapsular en clase o usar closures.

#### 3. Magic Numbers
```javascript
const isTimeDifferenceValid = timeDifference >= 10000; // ¿Por qué 10000?
```

**Solución**: Usar constantes nombradas:
```javascript
const MIN_TIME_BETWEEN_POINTS_MS = 10000; // 10 segundos
```

---

## 🔧 Decisiones Técnicas

### ¿Por qué LocalStorage?
- ✅ Simple de implementar
- ✅ No requiere backend
- ✅ Persistencia entre sesiones
- ❌ Límite de almacenamiento (~5-10MB)
- ❌ No compartible entre dispositivos
- ❌ Vulnerable a limpieza del navegador

**Alternativas futuras**: IndexedDB, Backend API

### ¿Por qué HERE Maps?
- ✅ API completa y documentada
- ✅ Tier gratuito generoso
- ✅ Buena calidad de mapas
- ❌ Requiere API key
- ❌ Lock-in con proveedor específico

**Alternativas**: Mapbox, Leaflet + OpenStreetMap, Google Maps

### ¿Por qué Vanilla JS?
- ✅ Sin dependencias adicionales
- ✅ Bundle size pequeño
- ✅ Rendimiento óptimo
- ❌ Más código boilerplate
- ❌ Sin reactividad automática
- ❌ Difícil de escalar

**Alternativas futuras**: React, Vue, Svelte

### ¿Por qué Parcel?
- ✅ Zero-config bundler
- ✅ Hot Module Replacement
- ✅ Manejo automático de assets
- ✅ Rápido para proyectos pequeños
- ❌ Menos control que Webpack/Vite

---

## 📊 Diagramas

### Diagrama de Componentes

```
┌─────────────────────────────────────────────┐
│              index.html                      │
│  ┌─────────────────────────────────────┐    │
│  │  Lista de Routes                    │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐        │    │
│  │  │Route1│ │Route2│ │Route3│        │    │
│  │  └──────┘ └──────┘ └──────┘        │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  [Agregar Recorrido]                │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  <input type="file"> [Importar]     │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                    ↓ navigate
┌─────────────────────────────────────────────┐
│              track.html                      │
│  ┌─────────────────────────────────────┐    │
│  │          Mapa HERE                  │    │
│  │  ┌────────────────────────────┐     │    │
│  │  │ ○──○──○──○  (Polyline)    │     │    │
│  │  └────────────────────────────┘     │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ [Iniciar] [Terminar] [Guardar]      │    │
│  │ [Exportar] [Volver] [+] [-]         │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ Distancia: 1234.56m                 │    │
│  │ Puntos: 45                          │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ • Lat: 37.386, Lng: -122.083        │    │
│  │ • Lat: 37.387, Lng: -122.084        │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Diagrama de Secuencia: Tracking

```
Usuario    track.html    track.js       Geolocation    HERE Maps    localStorage
  │            │            │                │              │             │
  │   Click    │            │                │              │             │
  │  Iniciar   │            │                │              │             │
  │────────────>────────────>watchPosition() │              │             │
  │            │            │────────────────>              │             │
  │            │            │                │              │             │
  │            │            │  [cada 10s]    │              │             │
  │            │            │<────────────────              │             │
  │            │            │ position       │              │             │
  │            │            │                │              │             │
  │            │            │  addMarker()   │              │             │
  │            │            │────────────────────────────────>            │
  │            │            │                │              │             │
  │            │            │  updatePolyline()             │             │
  │            │            │────────────────────────────────>            │
  │            │            │                │              │             │
  │            │<───────────│ updateUI()     │              │             │
  │<───────────│            │                │              │             │
  │  Display   │            │                │              │             │
  │            │            │                │              │             │
  │   Click    │            │                │              │             │
  │  Guardar   │            │                │              │             │
  │────────────>────────────> savePath()     │              │             │
  │            │            │────────────────────────────────────────────>│
  │            │            │                │              │  setItem()  │
  │            │            │                │              │             │
```

---

## 🚀 Escalabilidad

### Limitaciones Actuales

1. **LocalStorage**: Máximo ~10MB
2. **Renderizado**: Polylines con miles de puntos pueden ser lentas
3. **Sin paginación**: Lista de routes carga todo de una vez
4. **Sin índices**: Búsqueda O(n) en array de routes

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

1. **API Key expuesta**: Visible en código del cliente
2. **Sin sanitización**: JSON import sin validación
3. **XSS potencial**: innerHTML sin sanitización
4. **Sin rate limiting**: API calls sin control

### Mitigaciones Recomendadas

1. **Proxy backend** para HERE Maps API
2. **Validación de esquema** para JSON imports
3. **Uso de textContent** en lugar de innerHTML
4. **Implementar throttling** en llamadas API

---

## 📚 Referencias

- [HERE Maps JavaScript API](https://developer.here.com/documentation/maps/3.1.48.0/dev_guide/index.html)
- [Geolocation API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [LocalStorage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Parcel Documentation](https://parceljs.org/)
