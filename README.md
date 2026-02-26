# Tracking App

Aplicación web para rastreo y registro de recorridos mediante GPS utilizando HERE Maps API.

## 📋 Descripción

Tracking App es una aplicación web que permite a los usuarios grabar recorridos mediante geolocalización GPS, visualizarlos en un mapa interactivo, guardarlos en almacenamiento local y exportarlos como archivos JSON. La aplicación utiliza la API de HERE Maps para la renderización de mapas y cálculo de rutas.

## 🚀 Características

- ✅ Grabación de recorridos en tiempo real con GPS
- ✅ Visualización de recorridos en mapa interactivo
- ✅ Cálculo automático de distancia recorrida
- ✅ Almacenamiento persistente en LocalStorage
- ✅ Exportación de recorridos a formato JSON
- ✅ Importación de recorridos desde archivos JSON
- ✅ Panel de gestión de recorridos guardados
- ✅ Controles de zoom del mapa
- ✅ Visualización de puntos GPS capturados

## 🏗️ Arquitectura Actual

### Estructura de Archivos

```
tracking/
├── src/
│   ├── index.html      # Página principal - Dashboard de recorridos
│   ├── track.html      # Página de seguimiento GPS
│   ├── track.js        # Lógica de tracking (ACTIVO)
│   ├── route.js        # Clase Route (NO UTILIZADO - refactorización incompleta)
│   └── styles.css      # Estilos globales
├── package.json
├── bun.lockb
├── prettierrc.json
└── README.md
```

### Componentes Principales

#### 1. Dashboard ([index.html](src/index.html))

- **Función**: Pantalla principal que lista todos los recorridos guardados
- **Características**:
  - Lista de recorridos almacenados en localStorage
  - Botón para iniciar nuevo recorrido
  - Input para importar recorridos desde JSON
  - Navegación a vista detallada de cada recorrido

#### 2. Vista de Tracking ([track.html](src/track.html))

- **Función**: Interfaz de grabación y visualización de recorridos
- **Características**:
  - Mapa interactivo con HERE Maps
  - Botones de control (Iniciar, Terminar, Exportar, Guardar, etc.)
  - Visualización en tiempo real de distancia y puntos
  - Lista de coordenadas capturadas

#### 3. Lógica de Tracking ([track.js](src/track.js))

- **Función**: Implementación principal del sistema de tracking
- **Componentes clave**:
  - Inicialización de HERE Maps Platform
  - Gestión de watchPosition de Geolocation API
  - Cálculo de distancias (fórmula Haversine)
  - Renderizado de polylines en el mapa
  - Persistencia en localStorage
  - Sistema de exportación/importación JSON

### Flujo de Datos

```
Usuario → Botón "Iniciar" → navigator.geolocation.watchPosition()
    ↓
Captura GPS (cada 10 segundos) → path.push(position)
    ↓
Actualización del mapa (polyline + markers) + Cálculo de distancia
    ↓
Guardar → localStorage.setItem("routes", ...)
    ↓
Exportar → Blob JSON descargable
```

### Storage Schema

```javascript
// LocalStorage Key: "routes"
[
  {
    name: "Route-1234567890",
    id: 1234567890,           // timestamp
    distance: 1234.56,        // metros
    path: [
      { lat: 37.386052, lng: -122.083851 },
      { lat: 37.386152, lng: -122.083951 },
      ...
    ]
  },
  ...
]
```

## 🔧 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Mapas**: HERE Maps API v3.1
- **Build Tool**: Parcel v2.12.0
- **Runtime**: Bun
- **Geolocalización**: Browser Geolocation API
- **Almacenamiento**: LocalStorage

## 📦 Instalación

```bash
# Instalar dependencias
bun install

# Configurar API Key de HERE Maps
# Editar track.js y agregar tu API key:
# const GEO_API_KEY = "TU_API_KEY_AQUI";

# Iniciar servidor de desarrollo
bun start

# Compilar para producción
bun run build
```

## 🌐 URLs de Desarrollo

- Dashboard: `http://localhost:1234/index.html`
- Tracking: `http://localhost:1234/track.html`
- Ver recorrido: `http://localhost:1234/track.html?id=ROUTE_ID`

## 🎯 Estado Actual

### ✅ Funcionalidades Implementadas

- [x] Tracking GPS en tiempo real
- [x] Visualización en mapa HERE Maps
- [x] Cálculo de distancia recorrida
- [x] Guardado de recorridos en localStorage
- [x] Exportación a JSON
- [x] Importación desde JSON
- [x] Vista de recorridos guardados
- [x] Reproducción de recorridos históricos
- [x] Controles de zoom
- [x] Filtrado temporal (puntos cada 10 segundos)

### 🚧 En Desarrollo / Incompleto

- [ ] Clase `Route` en [route.js](src/route.js) - Refactorización abandonada
- [ ] Sistema de autenticación
- [ ] Backend para almacenamiento persistente
- [ ] Edición de recorridos
- [ ] Análisis de estadísticas

## ⚠️ Known Issues

### 🐛 Bugs Críticos

1. **Función `actualTracking()` defectuosa** ([track.js](src/track.js#L188))
   - **Problema**: No agrega puntos al array `path`, solo actualiza el mapa
   - **Impacto**: Los puntos no se guardan ni se calcula distancia
   - **Solución recomendada**: Agregar `path.push(actualPosition)` después de las validaciones

2. **No hay validación de API Key**
   - **Problema**: Si `GEO_API_KEY` está vacío, la app falla silenciosamente
   - **Impacto**: Usuario no recibe feedback de error
   - **Solución recomendada**: Validar API key al inicio y mostrar error

3. **Sin manejo de errores de geolocalización**
   - **Problema**: No hay callback de error en `watchPosition()`
   - **Impacto**: Si el usuario niega permisos, no hay feedback
   - **Solución recomendada**: Agregar segundo parámetro con callback de error

### ⚠️ Problemas Menores

4. **Botón "Stop" visible al cargar**
   - **Problema**: Al iniciar [track.html](src/track.html), el botón "Terminar" es visible
   - **Solución**: Agregar `style="display:none"` al botón en HTML

5. **Uso de `alert()` para feedback**
   - **Problema**: UX pobre, bloquea la interfaz
   - **Ubicaciones**: [index.html](src/index.html#L38), [track.js](src/track.js#L276)
   - **Solución**: Implementar notificaciones toast

6. **Sin validación de JSON importado**
   - **Problema**: No valida estructura de archivo JSON importado
   - **Impacto**: Puede causar errores si el formato es incorrecto
   - **Solución**: Validar schema antes de `JSON.parse()`

7. **Código duplicado**
   - **Problema**: Lógica de validación temporal duplicada en `startTracking()` y `actualTracking()`
   - **Solución**: Extraer a función reutilizable

8. **Archivo [route.js](src/route.js) sin uso**
   - **Problema**: Clase `Route` incompleta y nunca importada
   - **Impacto**: Código muerto que confunde
   - **Solución**: Completar refactorización o eliminar archivo

9. **Sin funcionalidad de eliminar recorridos**
   - **Problema**: Los usuarios pueden guardar pero no eliminar rutas
   - **Solución**: Agregar botón de eliminación en dashboard

10. **Variable global `polyline` no inicializada**
    - **Problema**: `let polyline;` sin valor inicial puede causar errores
    - **Solución**: Inicializar como `let polyline = null;`

11. **Comentarios en dos idiomas**
    - **Problema**: Mezcla de español e inglés reduce legibilidad
    - **Solución**: Estandarizar a un solo idioma

### 🔒 Consideraciones de Seguridad

12. **API Key expuesta en cliente**
    - **Problema**: La API key está en el código del cliente
    - **Impacto**: Puede ser extraída y usada por terceros
    - **Solución**: Implementar proxy backend para llamadas a HERE Maps

13. **Sin límite de almacenamiento**
    - **Problema**: LocalStorage tiene límite de ~5-10MB
    - **Impacto**: App puede fallar con muchos recorridos largos
    - **Solución**: Implementar límite y cleanup automático

### 📱 Problemas de Compatibilidad

14. **Sin fallback para navegadores sin geolocalización**
    - **Problema**: Solo muestra mensaje de error, no ofrece alternativa
    - **Solución**: Permitir entrada manual de coordenadas

15. **Rendimiento con recorridos largos**
    - **Problema**: Polylines con miles de puntos pueden ser lentas
    - **Solución**: Implementar simplificación de líneas (algoritmo Douglas-Peucker)

## 🔮 Mejoras Futuras Recomendadas

1. **Arquitectura**:
   - Completar refactorización a clase `Route`
   - Implementar patrón MVC o similar
   - Separar lógica de presentación

2. **Funcionalidades**:
   - Eliminar recorridos
   - Editar nombre de recorridos
   - Soporte para múltiples marcadores y POIs
   - Compartir recorridos vía URL o QR
   - Modo offline con Service Workers
   - Estadísticas avanzadas (velocidad, elevación)

3. **UX/UI**:
   - Diseño responsive mejorado
   - Sistema de notificaciones toast
   - Loader durante operaciones
   - Confirmaciones antes de acciones destructivas
   - Tema oscuro/claro

4. **Técnico**:
   - TypeScript para type safety
   - Testing (Jest + Testing Library)
   - CI/CD pipeline
   - Backend con base de datos
   - Autenticación de usuarios
   - Optimización de bundle size

## 📝 Notas de Desarrollo

- **API Key**: Actualmente usa variable de entorno `GEO_API_KEY` con fallback a string vacío
- **Filtro temporal**: Los puntos GPS se capturan máximo cada 10 segundos
- **Cálculo de distancia**: Utiliza fórmula Haversine para distancia geodésica
- **Zoom inicial**: Nivel 18 (muy cercano)
- **Coordenadas default**: Cupertino, California (37.386052, -122.083851)

## 🤝 Contribuir

Para contribuir a este proyecto:

1. Resolver algún issue de la lista anterior
2. Asegurar que el código siga el estilo existente
3. Probar funcionalidad antes de commit
4. Verificar que `bun run build` compile sin errores

## 📄 Licencia

MIT - Ver archivo LICENSE para detalles

## 👤 Autor

**jarp** - [jrodrigopuca](https://github.com/jrodrigopuca)
