/**
 * @fileoverview UIController - Controlador de interfaz de usuario
 * @module ui/UIController
 * @description Maneja eventos del DOM, actualiza la UI y coordina con otros servicios.
 * Implementa Single Responsibility: solo lógica de UI.
 *
 * @example
 * import { UIController } from './ui/UIController.js';
 *
 * const ui = new UIController({
 *   mapService,
 *   geoService,
 *   storageService
 * });
 * ui.init();
 */

import { EventBus } from "../core/EventBus.js";
import { Notifications } from "./Notifications.js";
import { Route } from "../models/Route.js";
import { GeoSimulator } from "../core/GeoSimulator.js";

/**
 * @typedef {Object} UIElements
 * @property {HTMLElement} startBtn - Botón iniciar
 * @property {HTMLElement} stopBtn - Botón detener
 * @property {HTMLElement} saveBtn - Botón guardar
 * @property {HTMLElement} exportBtn - Botón exportar
 * @property {HTMLElement} distanceDisplay - Display de distancia
 * @property {HTMLElement} pointsDisplay - Display de puntos
 * @property {HTMLElement} statusDisplay - Display de estado
 */

/**
 * @typedef {Object} UIControllerDependencies
 * @property {import('../core/MapService.js').MapService} mapService
 * @property {import('../core/GeoLocationService.js').GeoLocationService} geoService
 * @property {import('../core/StorageService.js').StorageService} storageService
 */

/**
 * Controlador de UI para la vista de tracking.
 * Coordina la interacción entre usuario y servicios.
 *
 * @class UIController
 */
export class UIController {
	/** @type {import('../core/MapService.js').MapService} */
	#mapService;

	/** @type {import('../core/GeoLocationService.js').GeoLocationService} */
	#geoService;

	/** @type {import('../core/StorageService.js').StorageService} */
	#storageService;

	/** @type {import('../core/WakeLockService.js').WakeLockService|null} */
	#wakeLockService = null;

	/** @type {Route|null} */
	#currentRoute = null;

	/** @type {UIElements} */
	#elements = {};

	/** @type {boolean} Modo simulación activo */
	#simulationMode = false;

	/** @type {GeoSimulator|null} Instancia del simulador */
	#simulator = null;

	/** @type {L.Marker|null} Marker del punto de inicio */
	#startMarker = null;

	/** @type {L.Marker|null} Marker de la posición actual */
	#currentMarker = null;

	/** @type {boolean} Si está haciendo tracking activo */
	#isTrackingActive = false;

	/**
	 * Crea una instancia de UIController.
	 *
	 * @param {UIControllerDependencies} dependencies - Servicios inyectados
	 */
	constructor({
		mapService,
		geoService,
		storageService,
		wakeLockService = null,
	}) {
		this.#mapService = mapService;
		this.#geoService = geoService;
		this.#storageService = storageService;
		this.#wakeLockService = wakeLockService;
	}

	/**
	 * Inicializa el controlador.
	 * Cachea elementos del DOM y configura event listeners.
	 *
	 * @returns {void}
	 */
	init() {
		this.#cacheElements();
		this.#bindEvents();
		this.#subscribeToEvents();
		this.#updateUI();
		this.#checkSimulationMode();

		Notifications.info("Aplicación lista");
	}

	/**
	 * Verifica si el modo simulación está activo via URL e inicia automáticamente.
	 *
	 * @private
	 */
	#checkSimulationMode() {
		const urlParams = new URLSearchParams(window.location.search);
		this.#simulationMode = urlParams.get("simulate") === "true";

		if (this.#simulationMode) {
			// Iniciar simulación automáticamente después de un breve delay
			setTimeout(() => this.#autoStartSimulation(), 500);
		}
	}

	/**
	 * Inicia la simulación automáticamente con ciudad aleatoria.
	 *
	 * @private
	 */
	#autoStartSimulation() {
		// Limpiar tracking anterior
		this.#startMarker = null;
		this.#currentMarker = null;
		this.#mapService.clear();

		// Crear simulador con ciudad aleatoria (pasar null)
		this.#simulator = new GeoSimulator(null, {
			interval: 1000,
			speed: 1.5,
		});

		const city = this.#simulator.getSelectedCity();
		const startPos = this.#simulator.getStartPosition();

		// Centrar mapa en la ciudad elegida
		this.#mapService.centerOn(startPos, 17);

		// Crear nueva ruta
		const routeName = `Paseo por ${city.name}`;
		if (this.#elements.routeNameInput) {
			this.#elements.routeNameInput.value = routeName;
		}
		this.#currentRoute = new Route(routeName);

		// Iniciar simulador
		this.#simulator.start((position) => {
			EventBus.emit("location:updated", position);
		});

		EventBus.emit("tracking:started", { timestamp: Date.now() });
		Notifications.success(`🎮 Simulando paseo en ${city.name}`);
		console.log(`🎮 Simulation started in ${city.name}`, startPos);
	}

	/**
	 * Cachea referencias a elementos del DOM.
	 *
	 * @private
	 * @returns {void}
	 */
	#cacheElements() {
		this.#elements = {
			startBtn: document.getElementById("btn-start"),
			stopBtn: document.getElementById("btn-stop"),
			saveBtn: document.getElementById("btn-save"),
			exportBtn: document.getElementById("btn-export"),
			locationBtn: document.getElementById("btn-location"),
			distanceDisplay: document.getElementById("distance"),
			pointsDisplay: document.getElementById("points"),
			statusDisplay: document.getElementById("status"),
			routeNameInput: document.getElementById("route-name"),
		};
	}

	/**
	 * Configura event listeners del DOM.
	 *
	 * @private
	 * @returns {void}
	 */
	#bindEvents() {
		const { startBtn, stopBtn, saveBtn, exportBtn, locationBtn } =
			this.#elements;

		startBtn?.addEventListener("click", () => this.startTracking());
		stopBtn?.addEventListener("click", () => this.stopTracking());
		saveBtn?.addEventListener("click", () => this.saveRoute());
		exportBtn?.addEventListener("click", () => this.exportRoute());
		locationBtn?.addEventListener("click", () => this.goToMyLocation());

		// Resize handler
		window.addEventListener("resize", () => {
			this.#mapService?.invalidateSize();
		});
	}

	/**
	 * Suscribe a eventos del EventBus.
	 *
	 * @private
	 * @returns {void}
	 */
	#subscribeToEvents() {
		EventBus.on("location:updated", (pos) => this.#onLocationUpdate(pos));
		EventBus.on("location:error", (err) => this.#onLocationError(err));
		EventBus.on("tracking:started", () => this.#onTrackingStarted());
		EventBus.on("tracking:stopped", () => this.#onTrackingStopped());
	}

	/**
	 * Inicia el tracking de ubicación.
	 *
	 * @returns {void}
	 */
	startTracking() {
		// Limpiar tracking anterior
		this.#startMarker = null;
		this.#currentMarker = null;
		this.#mapService.clear();

		// Crear nueva ruta
		const name = this.#elements.routeNameInput?.value || "Recorrido";
		this.#currentRoute = new Route(name);

		if (this.#simulationMode) {
			this.#startSimulation();
			return;
		}

		if (!this.#geoService.isSupported()) {
			Notifications.error("Tu navegador no soporta geolocalización");
			return;
		}

		this.#geoService.startWatching(
			(pos) => {}, // Eventos manejados por EventBus
			(err) => {},
		);
	}

	/**
	 * Inicia el simulador de GPS.
	 *
	 * @private
	 */
	#startSimulation() {
		// Obtener posición actual del mapa como punto de inicio
		const center = this.#mapService.getCenter();
		const startPos = center || { lat: -12.0464, lng: -77.0428 };

		this.#simulator = new GeoSimulator(startPos, {
			interval: 1000,
			speed: 1.5, // ~5.4 km/h (caminata rápida)
		});

		this.#simulator.start((position) => {
			// Emitir evento igual que el GPS real
			EventBus.emit("location:updated", position);
		});

		// Simular evento de tracking iniciado
		EventBus.emit("tracking:started", { timestamp: Date.now() });
		Notifications.success("🎮 Simulación iniciada");
	}

	/**
	 * Detiene el tracking de ubicación.
	 *
	 * @returns {void}
	 */
	stopTracking() {
		if (this.#simulationMode && this.#simulator) {
			this.#simulator.stop();
			this.#simulator = null;
			EventBus.emit("tracking:stopped", { timestamp: Date.now() });
		} else {
			this.#geoService.stopWatching();
		}
	}

	/**
	 * Guarda el recorrido actual.
	 *
	 * @returns {void}
	 */
	saveRoute() {
		if (!this.#currentRoute || this.#currentRoute.getPointCount() === 0) {
			Notifications.warning("No hay recorrido para guardar");
			return;
		}

		// Actualizar nombre si cambió
		const name = this.#elements.routeNameInput?.value;
		if (name) {
			this.#currentRoute.name = name;
		}

		const saved = this.#storageService.save(this.#currentRoute.toJSON());

		if (saved) {
			Notifications.success(`Recorrido "${this.#currentRoute.name}" guardado`);
		} else {
			Notifications.error("Error al guardar el recorrido");
		}
	}

	/**
	 * Exporta el recorrido actual a JSON.
	 *
	 * @returns {void}
	 */
	exportRoute() {
		if (!this.#currentRoute || this.#currentRoute.getPointCount() === 0) {
			Notifications.warning("No hay recorrido para exportar");
			return;
		}

		this.#storageService.exportToJson(this.#currentRoute.toJSON());
		Notifications.info("Recorrido exportado");
	}

	/**
	 * Centra el mapa en la ubicación actual del usuario.
	 *
	 * @returns {Promise<void>}
	 */
	async goToMyLocation() {
		try {
			Notifications.info("Obteniendo ubicación...");
			const pos = await this.#geoService.getCurrentPosition();
			this.#mapService.centerOn(pos, 17);
			this.#mapService.addUserMarker(pos, "Estás aquí");
			Notifications.success("Ubicación encontrada");
		} catch (error) {
			Notifications.error("No se pudo obtener tu ubicación");
			console.error("Error getting location:", error);
		}
	}

	/**
	 * Maneja actualización de ubicación.
	 *
	 * @private
	 * @param {Object} pos - Posición
	 * @returns {void}
	 */
	#onLocationUpdate(pos) {
		if (!this.#currentRoute) return;

		const isFirstPoint = this.#currentRoute.getPointCount() === 0;

		// Agregar punto
		this.#currentRoute.addPoint(pos.lat, pos.lng);

		// Marker de inicio (solo primer punto) - Verde
		if (isFirstPoint) {
			this.#startMarker = this.#mapService.addStartMarker(pos, "Inicio");
		}

		// Marker de posición actual (mover o crear) - Azul con pulso
		if (this.#currentMarker) {
			this.#currentMarker.setLatLng([pos.lat, pos.lng]);
		} else {
			this.#currentMarker = this.#mapService.addCurrentMarker(pos);
		}

		// Actualizar polyline y centrar mapa
		this.#mapService.updatePolyline(this.#currentRoute.points);
		this.#mapService.centerOn(pos);

		// Actualizar UI
		this.#updateStats();

		// Emitir evento
		EventBus.emit("route:point-added", {
			point: pos,
			total: this.#currentRoute.getPointCount(),
		});
	}

	/**
	 * Maneja errores de ubicación.
	 *
	 * @private
	 * @param {Object} err - Error
	 * @returns {void}
	 */
	#onLocationError(err) {
		Notifications.error(err.message);
		this.#setStatus("Error de GPS");
	}

	/**
	 * Maneja inicio de tracking.
	 *
	 * @private
	 * @returns {void}
	 */
	async #onTrackingStarted() {
		this.#isTrackingActive = true;
		this.#setButtonsState(true);
		this.#setStatus("Rastreando...");

		// Activar Wake Lock para mantener pantalla activa
		if (this.#wakeLockService) {
			const acquired = await this.#wakeLockService.request();
			if (acquired) {
				Notifications.success("Tracking iniciado - Pantalla activa 🔒");
			} else {
				Notifications.success("Tracking iniciado");
			}
		} else {
			Notifications.success("Tracking iniciado");
		}
	}

	/**
	 * Maneja fin de tracking.
	 *
	 * @private
	 * @returns {void}
	 */
	async #onTrackingStopped() {
		this.#isTrackingActive = false;
		this.#setButtonsState(false);
		this.#setStatus("Detenido");

		// Liberar Wake Lock
		if (this.#wakeLockService) {
			await this.#wakeLockService.release();
		}

		Notifications.info("Tracking detenido");
	}

	/**
	 * Verifica si el tracking está activo.
	 *
	 * @returns {boolean} True si está haciendo tracking
	 */
	isTracking() {
		return this.#isTrackingActive;
	}

	/**
	 * Actualiza estadísticas en pantalla.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateStats() {
		if (!this.#currentRoute) return;

		const distance = this.#currentRoute.getDistance();
		const points = this.#currentRoute.getPointCount();

		if (this.#elements.distanceDisplay) {
			this.#elements.distanceDisplay.textContent = distance.toFixed(2);
		}

		if (this.#elements.pointsDisplay) {
			this.#elements.pointsDisplay.textContent = points.toString();
		}
	}

	/**
	 * Actualiza estado de botones.
	 *
	 * @private
	 * @param {boolean} isTracking - Si está en tracking
	 * @returns {void}
	 */
	#setButtonsState(isTracking) {
		const { startBtn, stopBtn, saveBtn, exportBtn } = this.#elements;

		if (startBtn) startBtn.disabled = isTracking;
		if (stopBtn) stopBtn.disabled = !isTracking;
		if (saveBtn) saveBtn.disabled = isTracking;
		if (exportBtn) exportBtn.disabled = isTracking;

		// Mostrar/ocultar botones
		if (startBtn) startBtn.style.display = isTracking ? "none" : "inline-flex";
		if (stopBtn) stopBtn.style.display = isTracking ? "inline-flex" : "none";
	}

	/**
	 * Actualiza texto de estado.
	 *
	 * @private
	 * @param {string} text - Texto de estado
	 * @returns {void}
	 */
	#setStatus(text) {
		if (this.#elements.statusDisplay) {
			this.#elements.statusDisplay.textContent = text;
		}
	}

	/**
	 * Actualiza toda la UI al estado inicial.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateUI() {
		this.#setButtonsState(false);
		this.#setStatus("Listo");
		this.#updateStats();
	}

	/**
	 * Obtiene la ruta actual.
	 *
	 * @returns {Route|null} Ruta actual
	 */
	getCurrentRoute() {
		return this.#currentRoute;
	}

	/**
	 * Limpia la ruta actual y el mapa.
	 *
	 * @returns {void}
	 */
	clearCurrentRoute() {
		this.#currentRoute = null;
		this.#startMarker = null;
		this.#currentMarker = null;
		this.#mapService.clear();
		this.#updateStats();
		this.#setStatus("Listo");
	}

	/**
	 * Carga una ruta guardada por su ID.
	 *
	 * @param {string} routeId - ID de la ruta a cargar
	 * @returns {boolean} True si se cargó correctamente
	 */
	loadRoute(routeId) {
		const routeData = this.#storageService.getById(routeId);

		if (!routeData) {
			Notifications.error("Recorrido no encontrado");
			return false;
		}

		// Crear ruta desde datos guardados
		this.#currentRoute = Route.fromJSON(routeData);

		// Actualizar nombre en input
		if (this.#elements.routeNameInput) {
			this.#elements.routeNameInput.value = this.#currentRoute.name;
		}

		// Mostrar en mapa
		if (this.#currentRoute.points.length > 0) {
			// Dibujar polyline
			this.#mapService.updatePolyline(this.#currentRoute.points);

			// Agregar markers en inicio (verde) y fin (rojo)
			const firstPoint = this.#currentRoute.points[0];
			const lastPoint =
				this.#currentRoute.points[this.#currentRoute.points.length - 1];

			this.#mapService.addStartMarker(firstPoint, "Inicio");
			if (this.#currentRoute.points.length > 1) {
				this.#mapService.addEndMarker(lastPoint, "Fin");
			}

			// Centrar mapa en el primer punto del recorrido
			this.#mapService.centerOn(firstPoint, 17);
		}

		// Actualizar estadísticas
		this.#updateStats();
		this.#setStatus("Ruta cargada");

		// Deshabilitar botones de tracking para rutas cargadas
		this.#setViewOnlyMode(true);

		Notifications.success(`Ruta "${this.#currentRoute.name}" cargada`);
		return true;
	}

	/**
	 * Configura modo solo visualización (para rutas cargadas).
	 *
	 * @private
	 * @param {boolean} viewOnly - Si está en modo solo visualización
	 */
	#setViewOnlyMode(viewOnly) {
		const { startBtn, stopBtn, saveBtn, exportBtn } = this.#elements;

		if (viewOnly) {
			if (startBtn) startBtn.style.display = "none";
			if (stopBtn) stopBtn.style.display = "none";
			if (saveBtn) saveBtn.style.display = "none";
			if (exportBtn) {
				exportBtn.disabled = false;
				exportBtn.style.display = "inline-flex";
			}
		} else {
			this.#setButtonsState(false);
		}
	}
}

export default UIController;
