# Plan de Migración: HERE Maps → Leaflet + OpenStreetMap

**Fecha**: Febrero 26, 2026  
**Duración estimada**: 4-6 horas  
**Riesgo**: Bajo (cambio de biblioteca, misma funcionalidad)

---

## 📋 Resumen Ejecutivo

### Objetivo

Reemplazar HERE Maps API (propietaria, requiere API key) por Leaflet + OpenStreetMap (open source, gratuito, sin límites).

### Beneficios

- ✅ **Costo**: $0 para siempre (vs límites de HERE)
- ✅ **Sin API Key**: Elimina riesgo de exposición
- ✅ **Tamaño**: ~42KB vs ~200KB (mejor performance)
- ✅ **Independencia**: Sin vendor lock-in
- ✅ **Comunidad**: Más plugins y soporte

### Alcance

| Incluido                        | No incluido           |
| ------------------------------- | --------------------- |
| Migrar a Leaflet + OSM          | Backend/autenticación |
| Arquitectura SOLID              | Nuevas features       |
| Separación de responsabilidades | PWA/offline           |
| Actualizar documentación        |                       |
| ✅ Tests con Vitest             |                       |
| ✅ JSDoc completo               |                       |
| ✅ EventBus (Observer pattern)  |                       |

---

## 🏗️ Arquitectura SOLID Propuesta

### Principios Aplicados

| Principio                     | Aplicación                                                       |
| ----------------------------- | ---------------------------------------------------------------- |
| **S** - Single Responsibility | Cada módulo tiene una sola razón para cambiar                    |
| **O** - Open/Closed           | Módulos extensibles sin modificar código existente               |
| **L** - Liskov Substitution   | Interfaces intercambiables (ej: diferentes proveedores de mapas) |
| **I** - Interface Segregation | Interfaces pequeñas y específicas                                |
| **D** - Dependency Inversion  | Módulos dependen de abstracciones, no de implementaciones        |

### Nueva Estructura de Carpetas

```
src/
├── index.html                 # Dashboard (sin cambios mayores)
├── track.html                 # Vista de tracking (simplificada)
├── styles.css                 # Estilos globales
│
├── core/                      # Módulos centrales
│   ├── EventBus.js            # [S] Patrón Observer para eventos
│   ├── MapService.js          # [S] Abstracción del mapa
│   ├── GeoLocationService.js  # [S] Manejo de GPS
│   ├── StorageService.js      # [S] Persistencia de datos
│   └── DistanceCalculator.js  # [S] Cálculos geográficos
│
├── __tests__/                 # Tests unitarios
│   ├── DistanceCalculator.test.js
│   ├── Route.test.js
│   ├── StorageService.test.js
│   └── EventBus.test.js
│
├── models/                    # Modelos de datos
│   ├── Position.js            # Modelo de coordenada
│   └── Route.js               # Modelo de recorrido
│
├── ui/                        # Componentes de UI
│   ├── UIController.js        # [S] Manejo de DOM/eventos
│   └── Notifications.js       # [S] Sistema de notificaciones
│
└── app.js                     # Punto de entrada - composición
```

### Diagrama de Dependencias

```
                    ┌─────────────┐
                    │   app.js    │  ← Punto de entrada
                    │ (Composer)  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  UIController   │ │ MapService  │ │ StorageService  │
│  (UI Events)    │ │  (Leaflet)  │ │ (localStorage)  │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                 │
         │                 │                 │
         └────────┬────────┴────────┬────────┘
                  │                 │
                  ▼                 ▼
        ┌─────────────────┐ ┌─────────────┐
        │GeoLocationService│ │   Route     │
        │    (GPS API)    │ │  (Model)    │
        └────────┬────────┘ └─────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │DistanceCalculator│
        │   (Haversine)   │
        └─────────────────┘
```

---

## 📦 Módulos Detallados

### 1. `core/MapService.js` - Abstracción del Mapa

**Responsabilidad**: Única interfaz para operaciones de mapa (independiente del proveedor)

```javascript
/**
 * MapService - Wrapper de Leaflet
 * Principio: Single Responsibility - Solo maneja el mapa
 * Principio: Open/Closed - Extensible para otros proveedores
 */
export class MapService {
	#map = null;
	#polyline = null;
	#markers = [];

	constructor(containerId, options = {}) {
		const { lat = -12.0464, lng = -77.0428, zoom = 18 } = options;

		this.#map = L.map(containerId).setView([lat, lng], zoom);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: "© OpenStreetMap contributors",
		}).addTo(this.#map);
	}

	// Agregar un marker
	addMarker(position) {
		const marker = L.marker([position.lat, position.lng]).addTo(this.#map);
		this.#markers.push(marker);
		return marker;
	}

	// Actualizar polyline con array de posiciones
	updatePolyline(positions) {
		if (this.#polyline) {
			this.#map.removeLayer(this.#polyline);
		}

		const latLngs = positions.map((p) => [p.lat, p.lng]);
		this.#polyline = L.polyline(latLngs, {
			color: "blue",
			weight: 3,
		}).addTo(this.#map);

		return this.#polyline;
	}

	// Centrar mapa en posición
	centerOn(position) {
		this.#map.setView([position.lat, position.lng]);
	}

	// Control de zoom
	zoomIn() {
		this.#map.setZoom(this.#map.getZoom() + 1);
	}
	zoomOut() {
		this.#map.setZoom(this.#map.getZoom() - 1);
	}

	// Limpiar todos los markers
	clearMarkers() {
		this.#markers.forEach((m) => this.#map.removeLayer(m));
		this.#markers = [];
	}

	// Manejar resize
	invalidateSize() {
		this.#map.invalidateSize();
	}
}
```

---

### 2. `core/GeoLocationService.js` - Servicio de GPS

**Responsabilidad**: Única interfaz para geolocalización

```javascript
/**
 * GeoLocationService - Manejo de GPS
 * Principio: Single Responsibility - Solo GPS
 * Principio: Dependency Inversion - Callbacks inyectados
 */
export class GeoLocationService {
	#watchId = null;
	#options = {
		enableHighAccuracy: true,
		timeout: 10000,
		maximumAge: 0,
	};

	constructor(options = {}) {
		this.#options = { ...this.#options, ...options };
	}

	// Verificar soporte
	isSupported() {
		return "geolocation" in navigator;
	}

	// Iniciar tracking continuo
	startWatching(onSuccess, onError) {
		if (!this.isSupported()) {
			onError({ code: 0, message: "Geolocation not supported" });
			return;
		}

		this.#watchId = navigator.geolocation.watchPosition(
			(position) => {
				onSuccess({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy: position.coords.accuracy,
					timestamp: position.timestamp,
				});
			},
			(error) => {
				onError({
					code: error.code,
					message: this.#getErrorMessage(error),
				});
			},
			this.#options,
		);
	}

	// Detener tracking
	stopWatching() {
		if (this.#watchId !== null) {
			navigator.geolocation.clearWatch(this.#watchId);
			this.#watchId = null;
		}
	}

	// Obtener posición única
	getCurrentPosition() {
		return new Promise((resolve, reject) => {
			if (!this.isSupported()) {
				reject({ code: 0, message: "Geolocation not supported" });
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(position) =>
					resolve({
						lat: position.coords.latitude,
						lng: position.coords.longitude,
					}),
				(error) =>
					reject({
						code: error.code,
						message: this.#getErrorMessage(error),
					}),
				this.#options,
			);
		});
	}

	#getErrorMessage(error) {
		const messages = {
			1: "Permiso de ubicación denegado",
			2: "Ubicación no disponible",
			3: "Timeout al obtener ubicación",
		};
		return messages[error.code] || "Error desconocido";
	}
}
```

---

### 3. `core/StorageService.js` - Persistencia

**Responsabilidad**: Única interfaz para almacenamiento

```javascript
/**
 * StorageService - Persistencia de datos
 * Principio: Single Responsibility - Solo storage
 * Principio: Open/Closed - Fácil cambiar a IndexedDB/API
 */
export class StorageService {
	#storageKey;

	constructor(storageKey = "routes") {
		this.#storageKey = storageKey;
	}

	// Obtener todos los recorridos
	getAll() {
		try {
			const data = localStorage.getItem(this.#storageKey);
			return data ? JSON.parse(data) : [];
		} catch (error) {
			console.error("Error reading from storage:", error);
			return [];
		}
	}

	// Guardar un recorrido
	save(route) {
		try {
			const routes = this.getAll();
			routes.push(route);
			localStorage.setItem(this.#storageKey, JSON.stringify(routes));
			return true;
		} catch (error) {
			console.error("Error saving to storage:", error);
			return false;
		}
	}

	// Obtener recorrido por ID
	getById(id) {
		const routes = this.getAll();
		return routes.find((r) => r.id.toString() === id.toString()) || null;
	}

	// Eliminar recorrido por ID
	delete(id) {
		try {
			const routes = this.getAll().filter((r) => r.id !== id);
			localStorage.setItem(this.#storageKey, JSON.stringify(routes));
			return true;
		} catch (error) {
			console.error("Error deleting from storage:", error);
			return false;
		}
	}

	// Exportar a JSON
	exportToJson(route) {
		const jsonData = JSON.stringify(route.path, null, 2);
		const blob = new Blob([jsonData], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = `recorrido-${route.id}.json`;
		a.click();

		URL.revokeObjectURL(url);
	}

	// Importar desde JSON
	importFromJson(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const path = JSON.parse(e.target.result);

					// Validar estructura
					if (!Array.isArray(path)) {
						reject(new Error("El archivo debe contener un array"));
						return;
					}

					const isValid = path.every(
						(p) => typeof p.lat === "number" && typeof p.lng === "number",
					);

					if (!isValid) {
						reject(
							new Error("Formato inválido: cada punto debe tener lat y lng"),
						);
						return;
					}

					resolve(path);
				} catch (error) {
					reject(new Error("JSON inválido"));
				}
			};

			reader.onerror = () => reject(new Error("Error al leer archivo"));
			reader.readAsText(file);
		});
	}
}
```

---

### 4. `core/DistanceCalculator.js` - Cálculos

**Responsabilidad**: Cálculos geográficos

```javascript
/**
 * DistanceCalculator - Cálculos geográficos
 * Principio: Single Responsibility - Solo cálculos
 */
export class DistanceCalculator {
	/**
	 * Calcula distancia entre dos puntos usando fórmula Haversine
	 * @returns {number} Distancia en metros
	 */
	static calculate(pos1, pos2) {
		const R = 6371000; // Radio de la Tierra en metros

		const toRad = (deg) => (deg * Math.PI) / 180;

		const dLat = toRad(pos2.lat - pos1.lat);
		const dLng = toRad(pos2.lng - pos1.lng);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRad(pos1.lat)) *
				Math.cos(toRad(pos2.lat)) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c;
	}

	/**
	 * Calcula distancia total de un path
	 * @returns {number} Distancia en metros
	 */
	static calculateTotal(path) {
		if (path.length < 2) return 0;

		let total = 0;
		for (let i = 1; i < path.length; i++) {
			total += this.calculate(path[i - 1], path[i]);
		}
		return total;
	}
}
```

---

### 5. `models/Route.js` - Modelo de Recorrido

**Responsabilidad**: Estructura de datos de ruta

```javascript
/**
 * Route - Modelo de recorrido
 * Principio: Single Responsibility - Solo estructura de datos
 */
export class Route {
	constructor(data = {}) {
		this.id = data.id || Date.now();
		this.name = data.name || `Route-${this.id}`;
		this.path = data.path || [];
		this.distance = data.distance || 0;
		this.createdAt = data.createdAt || new Date().toISOString();
	}

	// Agregar posición al path
	addPosition(position) {
		this.path.push({
			lat: position.lat,
			lng: position.lng,
		});
	}

	// Verificar si posición ya existe
	hasPosition(position) {
		return this.path.some(
			(p) => p.lat === position.lat && p.lng === position.lng,
		);
	}

	// Obtener última posición
	getLastPosition() {
		return this.path.length > 0 ? this.path[this.path.length - 1] : null;
	}

	// Serializar para storage
	toJSON() {
		return {
			id: this.id,
			name: this.name,
			path: this.path,
			distance: this.distance,
			createdAt: this.createdAt,
		};
	}
}
```

---

### 6. `ui/UIController.js` - Controlador de UI

**Responsabilidad**: Manejo de DOM y eventos

```javascript
/**
 * UIController - Manejo de interfaz
 * Principio: Single Responsibility - Solo UI
 * Principio: Dependency Inversion - Recibe servicios por inyección
 */
export class UIController {
	#elements = {};
	#callbacks = {};

	constructor() {
		this.#cacheElements();
	}

	#cacheElements() {
		this.#elements = {
			startBtn: document.getElementById("start-button"),
			stopBtn: document.getElementById("stop-button"),
			actualBtn: document.getElementById("actual-button"),
			exportBtn: document.getElementById("export-button"),
			saveBtn: document.getElementById("save-button"),
			backBtn: document.getElementById("back-button"),
			zoomInBtn: document.getElementById("zoom-in-button"),
			zoomOutBtn: document.getElementById("zoom-out-button"),
			info: document.getElementById("info"),
			list: document.getElementById("list"),
		};
	}

	// Registrar callbacks
	on(event, callback) {
		this.#callbacks[event] = callback;
	}

	// Inicializar event listeners
	init() {
		const {
			startBtn,
			stopBtn,
			actualBtn,
			exportBtn,
			saveBtn,
			backBtn,
			zoomInBtn,
			zoomOutBtn,
		} = this.#elements;

		startBtn?.addEventListener("click", () => this.#callbacks.onStart?.());
		stopBtn?.addEventListener("click", () => this.#callbacks.onStop?.());
		actualBtn?.addEventListener("click", () => this.#callbacks.onActual?.());
		exportBtn?.addEventListener("click", () => this.#callbacks.onExport?.());
		saveBtn?.addEventListener("click", () => this.#callbacks.onSave?.());
		backBtn?.addEventListener("click", () => this.#callbacks.onBack?.());
		zoomInBtn?.addEventListener("click", () => this.#callbacks.onZoomIn?.());
		zoomOutBtn?.addEventListener("click", () => this.#callbacks.onZoomOut?.());
	}

	// Mostrar estado de tracking
	showTrackingState(isTracking) {
		if (this.#elements.startBtn) {
			this.#elements.startBtn.style.display = isTracking ? "none" : "block";
		}
		if (this.#elements.stopBtn) {
			this.#elements.stopBtn.style.display = isTracking ? "block" : "none";
		}
	}

	// Actualizar panel de info
	updateInfo(distance, pointCount) {
		if (this.#elements.info) {
			this.#elements.info.innerHTML = `
                <p>Distancia recorrida: ${distance.toFixed(2)} metros</p>
                <p>Puntos recorridos: ${pointCount}</p>
            `;
		}
	}

	// Mostrar error
	showError(message) {
		if (this.#elements.info) {
			this.#elements.info.innerHTML = `
                <p class="error">⚠️ ${message}</p>
            `;
		}
	}

	// Agregar posición a la lista
	addToList(position) {
		if (this.#elements.list) {
			this.#elements.list.innerHTML += `
                <li>Lat: ${position.lat.toFixed(6)} Lng: ${position.lng.toFixed(6)}</li>
            `;
		}
	}

	// Limpiar lista
	clearList() {
		if (this.#elements.list) {
			this.#elements.list.innerHTML = "";
		}
	}
}
```

---

### 7. `ui/Notifications.js` - Sistema de Notificaciones

**Responsabilidad**: Mostrar feedback al usuario (reemplaza alerts)

```javascript
/**
 * Notifications - Sistema de notificaciones toast
 * Principio: Single Responsibility - Solo notificaciones
 */
export class Notifications {
	static #container = null;

	static #ensureContainer() {
		if (!this.#container) {
			this.#container = document.createElement("div");
			this.#container.id = "notifications-container";
			this.#container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            `;
			document.body.appendChild(this.#container);
		}
		return this.#container;
	}

	static show(message, type = "info", duration = 3000) {
		const container = this.#ensureContainer();

		const toast = document.createElement("div");
		toast.className = `toast toast-${type}`;
		toast.textContent = message;
		toast.style.cssText = `
            padding: 12px 24px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: white;
            opacity: 0;
            transition: opacity 0.3s;
            background-color: ${this.#getColor(type)};
        `;

		container.appendChild(toast);

		// Fade in
		requestAnimationFrame(() => {
			toast.style.opacity = "1";
		});

		// Auto remove
		setTimeout(() => {
			toast.style.opacity = "0";
			setTimeout(() => toast.remove(), 300);
		}, duration);
	}

	static #getColor(type) {
		const colors = {
			success: "#28a745",
			error: "#dc3545",
			warning: "#ffc107",
			info: "#17a2b8",
		};
		return colors[type] || colors.info;
	}

	static success(message) {
		this.show(message, "success");
	}
	static error(message) {
		this.show(message, "error");
	}
	static warning(message) {
		this.show(message, "warning");
	}
	static info(message) {
		this.show(message, "info");
	}
}
```

---

### 8. `app.js` - Punto de Entrada (Composición)

**Responsabilidad**: Componer y coordinar todos los módulos

```javascript
/**
 * App - Composición y coordinación
 * Principio: Dependency Inversion - Inyecta dependencias
 */
import { MapService } from "./core/MapService.js";
import { GeoLocationService } from "./core/GeoLocationService.js";
import { StorageService } from "./core/StorageService.js";
import { DistanceCalculator } from "./core/DistanceCalculator.js";
import { Route } from "./models/Route.js";
import { UIController } from "./ui/UIController.js";
import { Notifications } from "./ui/Notifications.js";

class TrackingApp {
	#mapService;
	#geoService;
	#storageService;
	#uiController;
	#currentRoute;
	#lastAddedTime = 0;
	#minTimeBetweenPoints = 10000; // 10 segundos

	constructor() {
		this.#mapService = new MapService("map-container", {
			lat: -12.0464, // Lima, Perú (cambiar según preferencia)
			lng: -77.0428,
			zoom: 18,
		});
		this.#geoService = new GeoLocationService();
		this.#storageService = new StorageService("routes");
		this.#uiController = new UIController();
		this.#currentRoute = new Route();

		this.#init();
	}

	#init() {
		// Verificar soporte de geolocalización
		if (!this.#geoService.isSupported()) {
			this.#uiController.showError("Geolocalización no soportada");
			return;
		}

		// Cargar ruta existente si hay ID en URL
		this.#loadRouteFromUrl();

		// Configurar eventos de UI
		this.#setupEventHandlers();

		// Manejar resize
		window.addEventListener("resize", () => {
			this.#mapService.invalidateSize();
		});
	}

	#loadRouteFromUrl() {
		const urlParams = new URLSearchParams(window.location.search);
		const routeId = urlParams.get("id");

		if (routeId) {
			const route = this.#storageService.getById(routeId);
			if (route) {
				this.#currentRoute = new Route(route);
				this.#renderExistingRoute();
			}
		}
	}

	#renderExistingRoute() {
		const { path, distance } = this.#currentRoute;

		if (path.length > 0) {
			// Renderizar polyline
			this.#mapService.updatePolyline(path);

			// Agregar markers
			path.forEach((pos) => this.#mapService.addMarker(pos));

			// Centrar en primer punto
			this.#mapService.centerOn(path[0]);

			// Actualizar UI
			this.#uiController.updateInfo(distance, path.length);
			path.forEach((pos) => this.#uiController.addToList(pos));
		}
	}

	#setupEventHandlers() {
		this.#uiController.on("onStart", () => this.#startTracking());
		this.#uiController.on("onStop", () => this.#stopTracking());
		this.#uiController.on("onActual", () => this.#startTracking());
		this.#uiController.on("onSave", () => this.#saveRoute());
		this.#uiController.on("onExport", () => this.#exportRoute());
		this.#uiController.on("onBack", () => this.#goBack());
		this.#uiController.on("onZoomIn", () => this.#mapService.zoomIn());
		this.#uiController.on("onZoomOut", () => this.#mapService.zoomOut());

		this.#uiController.init();
	}

	#startTracking() {
		this.#uiController.showTrackingState(true);

		this.#geoService.startWatching(
			(position) => this.#handleNewPosition(position),
			(error) => this.#handleGeoError(error),
		);
	}

	#stopTracking() {
		this.#geoService.stopWatching();
		this.#uiController.showTrackingState(false);
	}

	#handleNewPosition(position) {
		const now = Date.now();
		const timeDiff = now - this.#lastAddedTime;

		// Filtrar por tiempo y unicidad
		if (timeDiff < this.#minTimeBetweenPoints) return;
		if (this.#currentRoute.hasPosition(position)) return;

		this.#lastAddedTime = now;

		// Agregar al modelo
		this.#currentRoute.addPosition(position);

		// Calcular distancia
		const totalDistance = DistanceCalculator.calculateTotal(
			this.#currentRoute.path,
		);
		this.#currentRoute.distance = totalDistance;

		// Actualizar mapa
		this.#mapService.addMarker(position);
		this.#mapService.updatePolyline(this.#currentRoute.path);
		this.#mapService.centerOn(position);

		// Actualizar UI
		this.#uiController.updateInfo(
			totalDistance,
			this.#currentRoute.path.length,
		);
		this.#uiController.addToList(position);
	}

	#handleGeoError(error) {
		this.#uiController.showError(error.message);
		Notifications.error(error.message);
		this.#stopTracking();
	}

	#saveRoute() {
		if (this.#currentRoute.path.length === 0) {
			Notifications.warning("No hay puntos para guardar");
			return;
		}

		const success = this.#storageService.save(this.#currentRoute.toJSON());

		if (success) {
			Notifications.success("Recorrido guardado exitosamente");
		} else {
			Notifications.error("Error al guardar recorrido");
		}
	}

	#exportRoute() {
		if (this.#currentRoute.path.length === 0) {
			Notifications.warning("No hay puntos para exportar");
			return;
		}

		this.#storageService.exportToJson(this.#currentRoute);
		Notifications.success("Archivo descargado");
	}

	#goBack() {
		window.location.href = "index.html";
	}
}

// Iniciar aplicación
document.addEventListener("DOMContentLoaded", () => {
	new TrackingApp();
});
```

---

## 🎯 Beneficios de la Arquitectura SOLID

### Antes (track.js monolítico)

```
track.js (250+ líneas)
├── Variables globales mezcladas
├── Funciones de mapa
├── Funciones de GPS
├── Funciones de UI
├── Funciones de storage
├── Funciones de cálculo
└── Event listeners
```

### Después (Módulos separados)

```
Módulo               │ Responsabilidad          │ LOC
─────────────────────┼──────────────────────────┼─────
MapService.js        │ Solo operaciones de mapa │ ~50
GeoLocationService.js│ Solo GPS                 │ ~60
StorageService.js    │ Solo persistencia        │ ~70
DistanceCalculator.js│ Solo cálculos            │ ~30
Route.js             │ Solo modelo de datos     │ ~40
UIController.js      │ Solo DOM/eventos         │ ~80
Notifications.js     │ Solo feedback usuario    │ ~50
app.js               │ Solo composición         │ ~100
```

### Ventajas concretas

| Aspecto            | Beneficio                                        |
| ------------------ | ------------------------------------------------ |
| **Testing**        | Cada módulo se puede testear en aislamiento      |
| **Mantenimiento**  | Cambio en GPS no afecta UI ni mapa               |
| **Extensibilidad** | Agregar IndexedDB = solo cambiar StorageService  |
| **Reutilización**  | DistanceCalculator sirve para cualquier proyecto |
| **Legibilidad**    | Archivos pequeños y enfocados                    |
| **Debugging**      | Errores aislados a un módulo específico          |

---

## 🗂️ Inventario de Cambios (Actualizado)

### Archivos a Crear

| Archivo                          | Responsabilidad           | Complejidad |
| -------------------------------- | ------------------------- | ----------- |
| `src/core/MapService.js`         | Wrapper de Leaflet        | Media       |
| `src/core/GeoLocationService.js` | Manejo de GPS             | Media       |
| `src/core/StorageService.js`     | Persistencia localStorage | Baja        |
| `src/core/DistanceCalculator.js` | Cálculos Haversine        | Baja        |
| `src/models/Route.js`            | Modelo de datos           | Baja        |
| `src/ui/UIController.js`         | Manejo de DOM             | Media       |
| `src/ui/Notifications.js`        | Sistema de toasts         | Baja        |
| `src/app.js`                     | Punto de entrada          | Media       |

### Archivos a Modificar

| Archivo          | Cambios                          | Complejidad |
| ---------------- | -------------------------------- | ----------- |
| `src/track.html` | Simplificar, cargar módulos      | Baja        |
| `src/styles.css` | Agregar estilos Leaflet + toasts | Baja        |

### Archivos a Eliminar

| Archivo        | Razón                                |
| -------------- | ------------------------------------ |
| `src/track.js` | Reemplazado por arquitectura modular |
| `src/route.js` | Código muerto, nunca se usó          |

### Mapeo de APIs

| Función HERE Maps      | Equivalente Leaflet         |
| ---------------------- | --------------------------- |
| `H.service.Platform`   | No necesario                |
| `H.Map()`              | `L.map()`                   |
| `H.map.Marker()`       | `L.marker()`                |
| `H.map.Polyline()`     | `L.polyline()`              |
| `H.geo.LineString`     | Array de coordenadas        |
| `H.geo.Point`          | `L.latLng()` o `[lat, lng]` |
| `map.addObject()`      | `.addTo(map)`               |
| `map.removeObject()`   | `.remove()`                 |
| `map.setCenter()`      | `map.setView()`             |
| `map.setZoom()`        | `map.setZoom()`             |
| `map.getZoom()`        | `map.getZoom()`             |
| `H.mapevents.Behavior` | Incluido por defecto        |

---

## 📝 Plan de Ejecución

### Pre-requisitos

```bash
# Backup del código actual
git add -A
git commit -m "chore: backup before Leaflet migration"
git checkout -b feature/leaflet-migration
```

---

## Fase 1: Preparación (15 min)

### 1.1 Crear branch de migración

```bash
git checkout -b feature/leaflet-migration
```

### 1.2 Eliminar archivo no usado

```bash
rm src/route.js
```

### 1.3 Actualizar package.json (opcional - para npm/types)

```json
{
	"dependencies": {
		"leaflet": "^1.9.4"
	}
}
```

> **Nota**: Leaflet se puede usar via CDN sin instalación npm.

---

## Fase 2: Crear Estructura de Carpetas (5 min)

```bash
# Crear estructura de directorios
mkdir -p src/core src/models src/ui
```

---

## Fase 3: Crear Módulos Base (45 min)

### 3.1 Crear `src/core/DistanceCalculator.js`

```bash
touch src/core/DistanceCalculator.js
```

Contenido: Ver sección "📦 Módulos Detallados" → DistanceCalculator

### 3.2 Crear `src/models/Route.js`

```bash
touch src/models/Route.js
```

Contenido: Ver sección "📦 Módulos Detallados" → Route

---

## Fase 4: Crear Servicios Core (60 min)

### 4.1 Crear `src/core/MapService.js`

Contenido: Ver sección "📦 Módulos Detallados" → MapService

### 4.2 Crear `src/core/GeoLocationService.js`

Contenido: Ver sección "📦 Módulos Detallados" → GeoLocationService

### 4.3 Crear `src/core/StorageService.js`

Contenido: Ver sección "📦 Módulos Detallados" → StorageService

---

## Fase 5: Crear Capa UI (30 min)

### 5.1 Crear `src/ui/UIController.js`

Contenido: Ver sección "📦 Módulos Detallados" → UIController

### 5.2 Crear `src/ui/Notifications.js`

Contenido: Ver sección "📦 Módulos Detallados" → Notifications

---

## Fase 6: Crear App Principal (30 min)

### 6.1 Crear `src/app.js`

Contenido: Ver sección "📦 Módulos Detallados" → app.js (Composición)

---

## Fase 7: Actualizar HTMLs (20 min)

### 7.1 Nuevo `src/track.html`

```html
<!doctype html>
<html lang="es">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="initial-scale=1.0, width=device-width" />
		<title>Seguimiento de Recorrido</title>

		<!-- Leaflet CSS -->
		<link
			rel="stylesheet"
			href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
			integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
			crossorigin=""
		/>

		<link rel="stylesheet" href="./styles.css" />
	</head>
	<body>
		<div id="map-container"></div>

		<div class="controls">
			<button id="start-button" class="button">Iniciar</button>
			<button id="stop-button" class="button" style="display:none;">
				Terminar
			</button>
			<button id="actual-button" class="button">Mi ubicación</button>
			<button id="zoom-in-button" class="button">+</button>
			<button id="zoom-out-button" class="button">-</button>
		</div>

		<div class="actions">
			<button id="save-button" class="button button-primary">Guardar</button>
			<button id="export-button" class="button">Exportar</button>
			<button id="back-button" class="button">Volver</button>
		</div>

		<div id="info"></div>
		<ul id="list"></ul>

		<!-- Leaflet JS -->
		<script
			src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
			integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
			crossorigin=""
		></script>

		<!-- App con módulos ES6 -->
		<script src="./app.js" type="module"></script>
	</body>
</html>
```

### 7.2 Actualizar `src/index.html` (Dashboard)

```html
<!doctype html>
<html lang="es">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Panel de Recorridos</title>
		<link rel="stylesheet" href="./styles.css" />
	</head>
	<body>
		<h1>Panel de Recorridos</h1>

		<button id="add-route-btn" class="button button-primary">
			Nuevo Recorrido
		</button>

		<div id="routes-list"></div>

		<div class="import-section">
			<label for="fileInput" class="button">Importar JSON</label>
			<input type="file" id="fileInput" accept=".json" style="display:none;" />
		</div>

		<script type="module">
			import { StorageService } from "./core/StorageService.js";
			import { Notifications } from "./ui/Notifications.js";

			const storage = new StorageService("routes");

			const loadRoutes = () => {
				const routes = storage.getAll();
				const routesList = document.getElementById("routes-list");

				if (routes.length === 0) {
					routesList.innerHTML =
						'<p class="empty-state">No hay recorridos guardados.</p>';
					return;
				}

				routesList.innerHTML = routes
					.map(
						(route, index) => `
                <div class="route-card">
                    <div class="route-info">
                        <strong>Recorrido ${index + 1}</strong>
                        <span>${route.distance?.toFixed(0) || 0}m - ${route.path?.length || 0} puntos</span>
                    </div>
                    <div class="route-actions">
                        <button class="button" onclick="viewRoute(${route.id})">Ver</button>
                        <button class="button button-danger" onclick="deleteRoute(${route.id})">Eliminar</button>
                    </div>
                </div>
            `,
					)
					.join("");
			};

			window.viewRoute = (id) => {
				window.location.href = `track.html?id=${id}`;
			};

			window.deleteRoute = (id) => {
				if (confirm("¿Eliminar este recorrido?")) {
					storage.delete(id);
					Notifications.success("Recorrido eliminado");
					loadRoutes();
				}
			};

			document.getElementById("add-route-btn").addEventListener("click", () => {
				window.location.href = "track.html";
			});

			document
				.getElementById("fileInput")
				.addEventListener("change", async (e) => {
					const file = e.target.files[0];
					if (!file) return;

					try {
						const path = await storage.importFromJson(file);
						const route = {
							id: Date.now(),
							name: "Imported-" + Date.now(),
							distance: 0,
							path: path,
						};
						storage.save(route);
						Notifications.success("Recorrido importado");
						loadRoutes();
					} catch (error) {
						Notifications.error(error.message);
					}

					e.target.value = ""; // Reset input
				});

			loadRoutes();
		</script>
	</body>
</html>
```

---

## Fase 8: Actualizar Estilos (15 min)

### 8.1 Nuevo `src/styles.css`

```css
/* ===========================================
   Variables
   =========================================== */
:root {
	--primary-color: #007bff;
	--danger-color: #dc3545;
	--success-color: #28a745;
	--warning-color: #ffc107;
	--gray-100: #f8f9fa;
	--gray-200: #e9ecef;
	--gray-800: #343a40;
	--spacing: 12px;
	--radius: 4px;
}

/* ===========================================
   Base
   =========================================== */
* {
	box-sizing: border-box;
}

body {
	font-family:
		-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	margin: 0;
	padding: var(--spacing);
	background-color: var(--gray-100);
}

h1 {
	margin-top: 0;
	color: var(--gray-800);
}

/* ===========================================
   Mapa
   =========================================== */
#map-container {
	height: 300px;
	width: 100%;
	border-radius: var(--radius);
	margin-bottom: var(--spacing);
	z-index: 1;
}

/* ===========================================
   Botones
   =========================================== */
.button {
	margin: 4px;
	padding: var(--spacing);
	border: none;
	border-radius: var(--radius);
	background-color: var(--gray-200);
	cursor: pointer;
	font-size: 14px;
	transition: background-color 0.2s;
}

.button:hover {
	background-color: #dee2e6;
}

.button-primary {
	background-color: var(--primary-color);
	color: white;
}

.button-primary:hover {
	background-color: #0056b3;
}

.button-danger {
	background-color: var(--danger-color);
	color: white;
}

.button-danger:hover {
	background-color: #c82333;
}

/* ===========================================
   Layout
   =========================================== */
.controls,
.actions {
	margin-bottom: var(--spacing);
}

/* ===========================================
   Info Panel
   =========================================== */
#info {
	padding: var(--spacing);
	background-color: white;
	border-radius: var(--radius);
	margin-bottom: var(--spacing);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

#info p {
	margin: 4px 0;
}

/* ===========================================
   Lista de puntos
   =========================================== */
#list {
	list-style: none;
	padding: 0;
	margin: 0;
	max-height: 200px;
	overflow-y: auto;
	background: white;
	border-radius: var(--radius);
}

#list li {
	padding: 8px var(--spacing);
	border-bottom: 1px solid var(--gray-200);
	font-size: 12px;
	font-family: monospace;
}

/* ===========================================
   Dashboard - Route Cards
   =========================================== */
.route-card {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing);
	background: white;
	border-radius: var(--radius);
	margin-bottom: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.route-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.route-info span {
	font-size: 12px;
	color: #666;
}

.empty-state {
	text-align: center;
	color: #666;
	padding: 40px;
}

.import-section {
	margin-top: var(--spacing);
}

/* ===========================================
   Error State
   =========================================== */
.error {
	color: var(--danger-color);
	background-color: #f8d7da;
	padding: var(--spacing);
	border-radius: var(--radius);
	margin: var(--spacing) 0;
}

/* ===========================================
   Notifications (Toast)
   =========================================== */
#notifications-container {
	position: fixed;
	top: 20px;
	right: 20px;
	z-index: 9999;
}

.toast {
	padding: 12px 24px;
	margin-bottom: 10px;
	border-radius: var(--radius);
	color: white;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-success {
	background-color: var(--success-color);
}
.toast-error {
	background-color: var(--danger-color);
}
.toast-warning {
	background-color: var(--warning-color);
	color: black;
}
.toast-info {
	background-color: var(--primary-color);
}

/* ===========================================
   Leaflet Overrides
   =========================================== */
.leaflet-control-container {
	z-index: 1000;
}
```

---

## Fase 9: Limpieza (5 min)

```bash
# Eliminar archivos antiguos
rm src/track.js
rm src/route.js
```

---

## Fase 10: EventBus (Patrón Observer) (10 min)

### `src/core/EventBus.js`

```javascript
/**
 * @fileoverview EventBus - Sistema de eventos pub/sub para comunicación entre módulos
 * @module core/EventBus
 * @description Implementa el patrón Observer para desacoplar módulos.
 * Permite que los módulos se comuniquen sin conocerse directamente.
 */

/**
 * @typedef {Object} EventBus
 * @property {Object.<string, Function[]>} events - Mapa de eventos y sus callbacks
 */

/**
 * Bus de eventos central para la aplicación.
 * Implementa patrón Singleton mediante module pattern.
 *
 * @example
 * // Suscribirse a un evento
 * EventBus.on('route:saved', (route) => console.log('Guardado:', route));
 *
 * // Emitir un evento
 * EventBus.emit('route:saved', { name: 'Mi ruta', distance: 5.2 });
 *
 * // Desuscribirse
 * EventBus.off('route:saved', myCallback);
 */
export const EventBus = {
	/** @type {Object.<string, Function[]>} */
	events: {},

	/**
	 * Suscribe un callback a un evento
	 * @param {string} event - Nombre del evento
	 * @param {Function} callback - Función a ejecutar cuando se emita el evento
	 * @returns {void}
	 */
	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	},

	/**
	 * Desuscribe un callback de un evento
	 * @param {string} event - Nombre del evento
	 * @param {Function} callback - Función a remover
	 * @returns {void}
	 */
	off(event, callback) {
		if (!this.events[event]) return;
		this.events[event] = this.events[event].filter((cb) => cb !== callback);
	},

	/**
	 * Emite un evento notificando a todos los suscriptores
	 * @param {string} event - Nombre del evento
	 * @param {*} [data] - Datos a pasar a los callbacks
	 * @returns {void}
	 */
	emit(event, data) {
		if (!this.events[event]) return;
		this.events[event].forEach((callback) => callback(data));
	},

	/**
	 * Suscribe un callback que se ejecuta solo una vez
	 * @param {string} event - Nombre del evento
	 * @param {Function} callback - Función a ejecutar
	 * @returns {void}
	 */
	once(event, callback) {
		const wrapper = (data) => {
			callback(data);
			this.off(event, wrapper);
		};
		this.on(event, wrapper);
	},

	/**
	 * Limpia todos los listeners de un evento o todos los eventos
	 * @param {string} [event] - Nombre del evento (opcional, si no se pasa limpia todos)
	 * @returns {void}
	 */
	clear(event) {
		if (event) {
			delete this.events[event];
		} else {
			this.events = {};
		}
	},
};

export default EventBus;
```

### Eventos del Sistema

| Evento              | Emisor             | Datos                    | Descripción           |
| ------------------- | ------------------ | ------------------------ | --------------------- |
| `tracking:started`  | GeoLocationService | `{ timestamp }`          | Tracking iniciado     |
| `tracking:stopped`  | GeoLocationService | `{ timestamp }`          | Tracking detenido     |
| `location:updated`  | GeoLocationService | `{ lat, lng, accuracy }` | Nueva posición GPS    |
| `location:error`    | GeoLocationService | `{ code, message }`      | Error de GPS          |
| `route:point-added` | Route              | `{ point, total }`       | Punto agregado a ruta |
| `route:saved`       | StorageService     | `Route`                  | Ruta guardada         |
| `route:deleted`     | StorageService     | `{ id }`                 | Ruta eliminada        |
| `route:imported`    | StorageService     | `Route`                  | Ruta importada        |
| `map:ready`         | MapService         | `{ map }`                | Mapa inicializado     |
| `ui:notification`   | UIController       | `{ message, type }`      | Mostrar notificación  |

---

## Fase 11: Tests con Vitest (45 min)

### Configuración

```bash
# Instalar Vitest
bun add -D vitest @vitest/ui happy-dom
```

### `vitest.config.js`

```javascript
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
		include: ["src/__tests__/**/*.test.js"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			exclude: ["node_modules/", "src/__tests__/"],
		},
		globals: true,
	},
});
```

### `package.json` (scripts)

```json
{
	"scripts": {
		"start": "parcel src/index.html src/track.html",
		"build": "parcel build src/index.html src/track.html",
		"test": "vitest",
		"test:ui": "vitest --ui",
		"test:coverage": "vitest run --coverage"
	}
}
```

### `src/__tests__/EventBus.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventBus } from "../core/EventBus.js";

describe("EventBus", () => {
	beforeEach(() => {
		EventBus.clear();
	});

	describe("on/emit", () => {
		it("should call subscriber when event is emitted", () => {
			const callback = vi.fn();
			EventBus.on("test", callback);

			EventBus.emit("test", { data: "hello" });

			expect(callback).toHaveBeenCalledWith({ data: "hello" });
		});

		it("should call multiple subscribers", () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			EventBus.on("test", callback1);
			EventBus.on("test", callback2);

			EventBus.emit("test");

			expect(callback1).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});

		it("should not throw when emitting event with no subscribers", () => {
			expect(() => EventBus.emit("nonexistent")).not.toThrow();
		});
	});

	describe("off", () => {
		it("should unsubscribe callback", () => {
			const callback = vi.fn();
			EventBus.on("test", callback);
			EventBus.off("test", callback);

			EventBus.emit("test");

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe("once", () => {
		it("should call callback only once", () => {
			const callback = vi.fn();
			EventBus.once("test", callback);

			EventBus.emit("test");
			EventBus.emit("test");

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
```

### `src/__tests__/DistanceCalculator.test.js`

```javascript
import { describe, it, expect } from "vitest";
import { DistanceCalculator } from "../core/DistanceCalculator.js";

describe("DistanceCalculator", () => {
	describe("haversine", () => {
		it("should return 0 for same coordinates", () => {
			const distance = DistanceCalculator.haversine(
				40.7128,
				-74.006, // NYC
				40.7128,
				-74.006, // NYC
			);
			expect(distance).toBe(0);
		});

		it("should calculate distance between two known points", () => {
			// NYC to LA ~3936 km
			const distance = DistanceCalculator.haversine(
				40.7128,
				-74.006, // NYC
				34.0522,
				-118.2437, // LA
			);
			expect(distance).toBeCloseTo(3936, -2); // within ~100km
		});

		it("should return distance in kilometers", () => {
			// ~1km apart
			const distance = DistanceCalculator.haversine(
				0,
				0,
				0,
				0.009, // ~1km at equator
			);
			expect(distance).toBeCloseTo(1, 0);
		});
	});

	describe("totalDistance", () => {
		it("should return 0 for empty array", () => {
			expect(DistanceCalculator.totalDistance([])).toBe(0);
		});

		it("should return 0 for single point", () => {
			const points = [{ lat: 0, lng: 0 }];
			expect(DistanceCalculator.totalDistance(points)).toBe(0);
		});

		it("should calculate total distance for multiple points", () => {
			const points = [
				{ lat: 0, lng: 0 },
				{ lat: 0, lng: 0.009 }, // ~1km
				{ lat: 0, lng: 0.018 }, // ~1km more
			];
			const distance = DistanceCalculator.totalDistance(points);
			expect(distance).toBeCloseTo(2, 0);
		});
	});
});
```

### `src/__tests__/Route.test.js`

```javascript
import { describe, it, expect, beforeEach } from "vitest";
import { Route } from "../models/Route.js";

describe("Route", () => {
	let route;

	beforeEach(() => {
		route = new Route("Test Route");
	});

	describe("constructor", () => {
		it("should create route with name", () => {
			expect(route.name).toBe("Test Route");
		});

		it("should generate unique id", () => {
			const route2 = new Route("Another");
			expect(route.id).not.toBe(route2.id);
		});

		it("should initialize with empty points array", () => {
			expect(route.points).toEqual([]);
		});

		it("should set createdAt timestamp", () => {
			expect(route.createdAt).toBeDefined();
			expect(new Date(route.createdAt)).toBeInstanceOf(Date);
		});
	});

	describe("addPoint", () => {
		it("should add point to route", () => {
			route.addPoint(40.7128, -74.006);

			expect(route.points).toHaveLength(1);
			expect(route.points[0]).toMatchObject({
				lat: 40.7128,
				lng: -74.006,
			});
		});

		it("should add timestamp to point", () => {
			route.addPoint(40.7128, -74.006);

			expect(route.points[0].timestamp).toBeDefined();
		});
	});

	describe("getDistance", () => {
		it("should return 0 for empty route", () => {
			expect(route.getDistance()).toBe(0);
		});

		it("should calculate distance for route with points", () => {
			route.addPoint(0, 0);
			route.addPoint(0, 0.009);

			expect(route.getDistance()).toBeCloseTo(1, 0);
		});
	});

	describe("toJSON", () => {
		it("should serialize route to JSON", () => {
			route.addPoint(40.7128, -74.006);
			const json = route.toJSON();

			expect(json).toHaveProperty("id");
			expect(json).toHaveProperty("name", "Test Route");
			expect(json).toHaveProperty("points");
			expect(json).toHaveProperty("createdAt");
			expect(json).toHaveProperty("distance");
		});
	});

	describe("fromJSON", () => {
		it("should restore route from JSON", () => {
			route.addPoint(40.7128, -74.006);
			const json = route.toJSON();

			const restored = Route.fromJSON(json);

			expect(restored.name).toBe(route.name);
			expect(restored.points).toEqual(route.points);
		});
	});
});
```

### `src/__tests__/StorageService.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = {
	store: {},
	getItem: vi.fn((key) => localStorageMock.store[key] || null),
	setItem: vi.fn((key, value) => {
		localStorageMock.store[key] = value;
	}),
	removeItem: vi.fn((key) => {
		delete localStorageMock.store[key];
	}),
	clear: vi.fn(() => {
		localStorageMock.store = {};
	}),
};
global.localStorage = localStorageMock;

import { StorageService } from "../core/StorageService.js";

describe("StorageService", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	describe("saveRoute", () => {
		it("should save route to localStorage", () => {
			const route = { id: "1", name: "Test", points: [] };

			StorageService.saveRoute(route);

			expect(localStorageMock.setItem).toHaveBeenCalled();
		});
	});

	describe("getRoutes", () => {
		it("should return empty array when no routes", () => {
			const routes = StorageService.getRoutes();
			expect(routes).toEqual([]);
		});

		it("should return saved routes", () => {
			const routes = [{ id: "1", name: "Test" }];
			localStorageMock.store["tracking_routes"] = JSON.stringify(routes);

			const result = StorageService.getRoutes();

			expect(result).toEqual(routes);
		});
	});

	describe("deleteRoute", () => {
		it("should remove route by id", () => {
			const routes = [
				{ id: "1", name: "Keep" },
				{ id: "2", name: "Delete" },
			];
			localStorageMock.store["tracking_routes"] = JSON.stringify(routes);

			StorageService.deleteRoute("2");

			const saved = JSON.parse(localStorageMock.store["tracking_routes"]);
			expect(saved).toHaveLength(1);
			expect(saved[0].id).toBe("1");
		});
	});
});
```

---

## Fase 12: Testing y Verificación Final (30 min)

### Checklist de Testing

| Test                            | Comando/Acción             |
| ------------------------------- | -------------------------- |
| ☐ Servidor inicia               | `bun start`                |
| ☐ Mapa carga (Leaflet + OSM)    | Abrir track.html           |
| ☐ Módulos cargan sin errores    | Ver consola del navegador  |
| ☐ Botón "Iniciar" funciona      | Click y verificar GPS      |
| ☐ Markers se agregan            | Mover ubicación            |
| ☐ Polyline se dibuja            | Después de 2+ puntos       |
| ☐ Distancia se calcula          | Ver panel de info          |
| ☐ "Terminar" detiene tracking   | Click y verificar          |
| ☐ "Guardar" persiste            | Guardar y refrescar        |
| ☐ "Exportar" descarga JSON      | Click y verificar descarga |
| ☐ Dashboard lista recorridos    | Abrir index.html           |
| ☐ "Ver" carga recorrido         | Click en un recorrido      |
| ☐ "Eliminar" funciona           | Eliminar y verificar       |
| ☐ Importar JSON funciona        | Importar archivo           |
| ☐ Notificaciones toast aparecen | Guardar/eliminar           |
| ☐ Errores GPS se muestran       | Denegar permisos           |
| ☐ Resize funciona               | Cambiar tamaño ventana     |

---

## 📊 Resumen de Cambios (Actualizado)

### Estructura Final

```
src/
├── index.html              # Dashboard (mejorado)
├── track.html              # Vista tracking (simplificada)
├── styles.css              # Estilos (nuevos)
├── app.js                  # Punto de entrada
├── core/
│   ├── MapService.js       # Leaflet wrapper
│   ├── GeoLocationService.js # GPS
│   ├── StorageService.js   # localStorage
│   └── DistanceCalculator.js # Haversine
├── models/
│   └── Route.js            # Modelo de datos
└── ui/
    ├── UIController.js     # DOM/eventos
    └── Notifications.js    # Toast system
```

### Métricas

| Métrica               | Antes                   | Después               |
| --------------------- | ----------------------- | --------------------- |
| Archivos JS           | 2 (monolíticos)         | 8 (modulares)         |
| LOC por archivo       | 250+                    | 30-100                |
| Dependencias externas | HERE Maps (propietario) | Leaflet (open source) |
| API Key               | Requerida               | No necesaria          |
| Bundle size (libs)    | ~200KB                  | ~42KB                 |
| Principios SOLID      | ❌                      | ✅                    |
| Testabilidad          | Baja                    | Alta                  |
| Extensibilidad        | Baja                    | Alta                  |

### Bugs Corregidos

1. ✅ `actualTracking()` ahora guarda puntos correctamente
2. ✅ Manejo de errores de geolocalización completo
3. ✅ Validación de datos antes de guardar/exportar
4. ✅ Botón "Stop" oculto por defecto
5. ✅ Código duplicado eliminado
6. ✅ Sistema de notificaciones (reemplaza alerts)
7. ✅ Funcionalidad de eliminar recorridos
8. ✅ Validación de JSON al importar

---

## ⚠️ Rollback Plan

```bash
# Si algo sale mal, restaurar desde git
git checkout HEAD~1 -- src/
```

---

## 🎉 Post-Migración

### Próximos pasos recomendados

1. [ ] Actualizar README.md con nueva arquitectura
2. [ ] Actualizar ARCHITECTURE.md
3. [x] ~~Agregar tests unitarios para cada módulo~~ (incluido)
4. [ ] Considerar TypeScript para better DX
5. [ ] Implementar PWA (Service Worker)
6. [ ] Agregar coverage badge al README

### Plugins de Leaflet recomendados

| Plugin                  | Función              | Prioridad |
| ----------------------- | -------------------- | --------- |
| `leaflet-locatecontrol` | Botón "mi ubicación" | Alta      |
| `leaflet-fullscreen`    | Pantalla completa    | Media     |
| `leaflet-gpx`           | Export/import GPX    | Media     |
| `leaflet.markercluster` | Agrupar markers      | Baja      |

---

## 📋 Resumen Ejecutivo del Plan

| Fase      | Tiempo       | Descripción                                    |
| --------- | ------------ | ---------------------------------------------- |
| 1         | 15 min       | Preparación y backup                           |
| 2         | 5 min        | Crear estructura de carpetas                   |
| 3         | 45 min       | Crear módulos base (DistanceCalculator, Route) |
| 4         | 60 min       | Crear servicios core (Map, Geo, Storage)       |
| 5         | 30 min       | Crear capa UI (UIController, Notifications)    |
| 6         | 30 min       | Crear app.js (composición)                     |
| 7         | 20 min       | Actualizar HTMLs                               |
| 8         | 15 min       | Actualizar estilos                             |
| 9         | 5 min        | Limpieza                                       |
| 10        | 10 min       | EventBus (Observer pattern)                    |
| 11        | 45 min       | Tests con Vitest                               |
| 12        | 30 min       | Verificación final                             |
| **Total** | **~5 horas** |                                                |

---

## 📝 JSDoc - Guía de Estilo

### Convenciones JSDoc para el Proyecto

Todos los módulos deben seguir estas convenciones:

```javascript
/**
 * @fileoverview Descripción del archivo
 * @module nombre/del/modulo
 * @description Descripción extendida del propósito
 */
```

### Tipos Personalizados

```javascript
/**
 * @typedef {Object} Position
 * @property {number} lat - Latitud en grados decimales
 * @property {number} lng - Longitud en grados decimales
 * @property {number} [accuracy] - Precisión en metros (opcional)
 * @property {number} [timestamp] - Unix timestamp (opcional)
 */

/**
 * @typedef {Object} RouteData
 * @property {string} id - Identificador único
 * @property {string} name - Nombre del recorrido
 * @property {Position[]} points - Array de posiciones
 * @property {string} createdAt - ISO timestamp de creación
 * @property {number} distance - Distancia total en km
 */

/**
 * @typedef {Object} GeoError
 * @property {number} code - Código de error (0-3)
 * @property {string} message - Mensaje descriptivo
 */

/**
 * @typedef {Object} MapOptions
 * @property {number} [lat=-12.0464] - Latitud inicial
 * @property {number} [lng=-77.0428] - Longitud inicial
 * @property {number} [zoom=18] - Nivel de zoom inicial
 */
```

### Ejemplo: Módulo con JSDoc Completo

```javascript
/**
 * @fileoverview DistanceCalculator - Cálculos de distancia geográfica
 * @module core/DistanceCalculator
 * @description Implementa fórmula Haversine para calcular distancias
 * entre coordenadas GPS. No tiene dependencias externas.
 *
 * @example
 * import { DistanceCalculator } from './core/DistanceCalculator.js';
 *
 * // Distancia entre dos puntos
 * const km = DistanceCalculator.haversine(lat1, lng1, lat2, lng2);
 *
 * // Distancia total de una ruta
 * const total = DistanceCalculator.totalDistance(points);
 */

/** @constant {number} Radio de la Tierra en kilómetros */
const EARTH_RADIUS_KM = 6371;

/**
 * Servicio de cálculo de distancias geográficas.
 * Implementa el principio Single Responsibility: solo cálculos de distancia.
 *
 * @namespace DistanceCalculator
 */
export const DistanceCalculator = {
	/**
	 * Calcula la distancia entre dos puntos usando fórmula Haversine.
	 *
	 * @param {number} lat1 - Latitud del punto 1 (grados decimales)
	 * @param {number} lng1 - Longitud del punto 1 (grados decimales)
	 * @param {number} lat2 - Latitud del punto 2 (grados decimales)
	 * @param {number} lng2 - Longitud del punto 2 (grados decimales)
	 * @returns {number} Distancia en kilómetros
	 *
	 * @example
	 * // NYC a LA
	 * const distance = DistanceCalculator.haversine(
	 *   40.7128, -74.0060,  // New York
	 *   34.0522, -118.2437  // Los Angeles
	 * );
	 * console.log(distance); // ~3936 km
	 */
	haversine(lat1, lng1, lat2, lng2) {
		const toRad = (deg) => (deg * Math.PI) / 180;

		const dLat = toRad(lat2 - lat1);
		const dLng = toRad(lng2 - lng1);

		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return EARTH_RADIUS_KM * c;
	},

	/**
	 * Calcula la distancia total de un array de posiciones.
	 *
	 * @param {Position[]} points - Array de posiciones con lat/lng
	 * @returns {number} Distancia total en kilómetros
	 * @throws {TypeError} Si points no es un array
	 *
	 * @example
	 * const route = [
	 *   { lat: 0, lng: 0 },
	 *   { lat: 0, lng: 0.009 },
	 *   { lat: 0, lng: 0.018 }
	 * ];
	 * const total = DistanceCalculator.totalDistance(route);
	 * console.log(total); // ~2 km
	 */
	totalDistance(points) {
		if (!Array.isArray(points) || points.length < 2) {
			return 0;
		}

		return points.reduce((total, point, index) => {
			if (index === 0) return 0;
			const prev = points[index - 1];
			return total + this.haversine(prev.lat, prev.lng, point.lat, point.lng);
		}, 0);
	},
};

export default DistanceCalculator;
```

### Documentar Clases

```javascript
/**
 * @fileoverview Route - Modelo de datos para recorridos GPS
 * @module models/Route
 */

import { DistanceCalculator } from "../core/DistanceCalculator.js";

/**
 * Representa un recorrido GPS con puntos, distancia y metadatos.
 *
 * @class Route
 * @implements {RouteData}
 *
 * @example
 * const route = new Route('Mi paseo');
 * route.addPoint(-12.0464, -77.0428);
 * route.addPoint(-12.0470, -77.0435);
 * console.log(route.getDistance()); // distancia en km
 */
export class Route {
	/** @type {string} Identificador único */
	id;

	/** @type {string} Nombre del recorrido */
	name;

	/** @type {Position[]} Puntos del recorrido */
	points = [];

	/** @type {string} Fecha de creación ISO */
	createdAt;

	/**
	 * Crea una nueva instancia de Route.
	 *
	 * @param {string} [name='Sin nombre'] - Nombre del recorrido
	 * @param {string} [id] - ID opcional (se genera si no se provee)
	 */
	constructor(name = "Sin nombre", id = null) {
		this.id = id || crypto.randomUUID();
		this.name = name;
		this.createdAt = new Date().toISOString();
	}

	/**
	 * Agrega un punto al recorrido.
	 *
	 * @param {number} lat - Latitud en grados decimales
	 * @param {number} lng - Longitud en grados decimales
	 * @returns {Position} El punto agregado
	 */
	addPoint(lat, lng) {
		const point = {
			lat,
			lng,
			timestamp: Date.now(),
		};
		this.points.push(point);
		return point;
	}

	/**
	 * Calcula la distancia total del recorrido.
	 *
	 * @returns {number} Distancia en kilómetros
	 */
	getDistance() {
		return DistanceCalculator.totalDistance(this.points);
	}

	/**
	 * Serializa el recorrido a objeto plano.
	 *
	 * @returns {RouteData} Objeto serializable
	 */
	toJSON() {
		return {
			id: this.id,
			name: this.name,
			points: this.points,
			createdAt: this.createdAt,
			distance: this.getDistance(),
		};
	}

	/**
	 * Crea una instancia desde datos JSON.
	 *
	 * @static
	 * @param {RouteData} data - Datos del recorrido
	 * @returns {Route} Nueva instancia
	 */
	static fromJSON(data) {
		const route = new Route(data.name, data.id);
		route.points = data.points || [];
		route.createdAt = data.createdAt;
		return route;
	}
}
```

### Documentar Métodos Async

```javascript
/**
 * Importa un recorrido desde archivo JSON.
 *
 * @async
 * @param {File} file - Archivo JSON a importar
 * @returns {Promise<Position[]>} Array de posiciones
 * @throws {Error} Si el JSON es inválido
 * @throws {Error} Si el formato de datos es incorrecto
 *
 * @example
 * try {
 *   const points = await StorageService.importFromJson(file);
 *   console.log('Importados:', points.length, 'puntos');
 * } catch (error) {
 *   console.error('Error:', error.message);
 * }
 */
async importFromJson(file) {
  // ...
}
```

### Documentar Callbacks

```javascript
/**
 * Callback para posiciones GPS.
 * @callback PositionCallback
 * @param {Position} position - Posición actual
 * @returns {void}
 */

/**
 * Callback para errores de GPS.
 * @callback ErrorCallback
 * @param {GeoError} error - Error de geolocalización
 * @returns {void}
 */

/**
 * Inicia el seguimiento continuo de posición.
 *
 * @param {PositionCallback} onSuccess - Callback para nuevas posiciones
 * @param {ErrorCallback} onError - Callback para errores
 * @returns {void}
 */
startWatching(onSuccess, onError) {
  // ...
}
```

---

**¿Aprobado el plan? Procedamos con la implementación.**
