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
import { ExportService } from "../core/ExportService.js";

/**
 * @typedef {Object} UIElements
 * @property {HTMLElement} startBtn - Botón iniciar
 * @property {HTMLElement} finishBtn - Botón terminar
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

	/** @type {L.Marker[]} Markers de waypoints */
	#waypointMarkers = [];

	/** @type {boolean} Si está haciendo tracking activo */
	#isTrackingActive = false;

	/** @type {boolean} Si el tracking está pausado */
	#isPaused = false;

	/** @type {number|null} Interval ID para actualizar tiempo */
	#timerInterval = null;

	/** @type {number} Timestamp de inicio del tracking */
	#trackingStartTime = 0;

	/** @type {number} Tiempo acumulado antes de pausar (ms) */
	#pausedTimeAccumulated = 0;

	/** @type {number|null} Device orientation heading (degrees from north) */
	#deviceHeading = null;

	/** @type {number|null} Movement heading calculated from GPS */
	#movementHeading = null;

	/** @type {boolean} If device orientation is supported */
	#compassSupported = false;

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
		this.#initConnectivityMonitoring();
		this.#initCompass();
		this.#checkForPendingRoute();
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
			trackingActions: document.getElementById("tracking-actions"),
			pauseBtn: document.getElementById("btn-pause"),
			resumeBtn: document.getElementById("btn-resume"),
			finishBtn: document.getElementById("btn-finish"),
			saveBtn: document.getElementById("btn-save"),
			exportBtn: document.getElementById("btn-export"),
			exportDropdown: document.getElementById("export-dropdown"),
			shareBtn: document.getElementById("btn-share"),
			shareDivider: document.getElementById("share-divider"),
			locationBtn: document.getElementById("btn-location"),
			distanceDisplay: document.getElementById("distance"),
			pointsDisplay: document.getElementById("points"),
			statusDisplay: document.getElementById("status"),
			statusIndicator: document.getElementById("status-indicator"),
			routeNameInput: document.getElementById("route-name"),
			elapsedTimeDisplay: document.getElementById("elapsed-time"),
			speedDisplay: document.getElementById("speed"),
			// Waypoint elements
			waypointBtn: document.getElementById("btn-waypoint"),
			waypointModal: document.getElementById("waypoint-modal"),
			waypointNameInput: document.getElementById("waypoint-name"),
			waypointSaveBtn: document.getElementById("btn-waypoint-save"),
			waypointCancelBtn: document.getElementById("btn-waypoint-cancel"),
			// Connection indicators
			networkIndicator: document.getElementById("network-indicator"),
			gpsIndicator: document.getElementById("gps-indicator"),
			// Exit modal
			exitModal: document.getElementById("exit-modal"),
			exitSaveBtn: document.getElementById("btn-exit-save"),
			exitDiscardBtn: document.getElementById("btn-exit-discard"),
			exitCancelBtn: document.getElementById("btn-exit-cancel"),
			// Compass elements
			compass: document.getElementById("compass"),
			compassNeedle: document.getElementById("compass-needle"),
			compassHeading: document.getElementById("compass-heading"),
			compassDegrees: document.getElementById("compass-degrees"),
			compassLabel: document.getElementById("compass-label"),
		};
	}

	/**
	 * Configura event listeners del DOM.
	 *
	 * @private
	 * @returns {void}
	 */
	#bindEvents() {
		const {
			startBtn,
			pauseBtn,
			resumeBtn,
			saveBtn,
			exportBtn,
			exportDropdown,
			locationBtn,
		} = this.#elements;

		startBtn?.addEventListener("click", () => this.startTracking());
		pauseBtn?.addEventListener("click", () => this.pauseTracking());
		resumeBtn?.addEventListener("click", () => this.resumeTracking());
		this.#elements.finishBtn?.addEventListener("click", () =>
			this.stopTracking(),
		);
		saveBtn?.addEventListener("click", () => this.saveRoute());
		locationBtn?.addEventListener("click", () => this.goToMyLocation());

		// Waypoint handling
		this.#elements.waypointBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.#showWaypointModal();
		});
		this.#elements.waypointSaveBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.#saveWaypoint();
		});
		this.#elements.waypointCancelBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.#hideWaypointModal();
		});
		this.#elements.waypointModal
			?.querySelector(".modal__backdrop")
			?.addEventListener("click", () => this.#hideWaypointModal());
		this.#elements.waypointNameInput?.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.#saveWaypoint();
			}
			if (e.key === "Escape") this.#hideWaypointModal();
		});

		// Export dropdown handling
		exportBtn?.addEventListener("click", (e) => {
			e.stopPropagation();
			this.#toggleExportDropdown();
		});

		// Export dropdown item clicks
		exportDropdown?.querySelectorAll(".dropdown__item").forEach((item) => {
			item.addEventListener("click", (e) => {
				e.stopPropagation();
				const action = item.dataset.export;
				this.#handleExportAction(action);
				this.#closeExportDropdown();
			});
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", () => this.#closeExportDropdown());

		// Resize handler
		window.addEventListener("resize", () => {
			this.#mapService?.invalidateSize();
		});

		// Detect Web Share support
		this.#initWebShareSupport();

		// Exit modal handling
		this.#elements.exitSaveBtn?.addEventListener("click", () =>
			this.#handleExitSave(),
		);
		this.#elements.exitDiscardBtn?.addEventListener("click", () =>
			this.#handleExitDiscard(),
		);
		this.#elements.exitCancelBtn?.addEventListener("click", () =>
			this.#hideExitModal(),
		);
		this.#elements.exitModal
			?.querySelector(".modal__backdrop")
			?.addEventListener("click", () => this.#hideExitModal());

		// Visibility change detection (for exit warning)
		document.addEventListener("visibilitychange", () =>
			this.#onVisibilityChange(),
		);
		window.addEventListener("beforeunload", (e) => this.#onBeforeUnload(e));
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
			// If paused, GPS is already stopped but we need to emit the event
			if (this.#isPaused) {
				EventBus.emit("tracking:stopped", { timestamp: Date.now() });
			} else {
				this.#geoService.stopWatching();
			}
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
			// Clear pending route from localStorage
			this.#clearPendingRoute();
			Notifications.success(`Recorrido "${this.#currentRoute.name}" guardado`);
		} else {
			Notifications.error("Error al guardar el recorrido");
		}
	}

	/**
	 * Exporta el recorrido actual a JSON (legacy).
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
	 * Toggle del dropdown de exportación.
	 *
	 * @private
	 * @returns {void}
	 */
	#toggleExportDropdown() {
		const { exportDropdown } = this.#elements;
		if (!exportDropdown) return;

		exportDropdown.classList.toggle("is-open");
	}

	/**
	 * Cierra el dropdown de exportación.
	 *
	 * @private
	 * @returns {void}
	 */
	#closeExportDropdown() {
		const { exportDropdown } = this.#elements;
		if (!exportDropdown) return;

		exportDropdown.classList.remove("is-open");
	}

	/**
	 * Inicializa soporte de Web Share API.
	 *
	 * @private
	 * @returns {void}
	 */
	#initWebShareSupport() {
		const { shareBtn, shareDivider } = this.#elements;

		if (ExportService.canShare() && shareBtn && shareDivider) {
			shareBtn.style.display = "flex";
			shareDivider.style.display = "block";
		}
	}

	/**
	 * Maneja acciones de exportación.
	 *
	 * @private
	 * @param {string} action - Tipo de exportación
	 * @returns {Promise<void>}
	 */
	async #handleExportAction(action) {
		if (!this.#currentRoute || this.#currentRoute.getPointCount() === 0) {
			Notifications.warning("No hay recorrido para exportar");
			return;
		}

		const routeData = this.#currentRoute.toJSON();

		switch (action) {
			case "gpx":
				ExportService.downloadGPX(routeData);
				Notifications.success("Archivo GPX descargado");
				break;

			case "kml":
				ExportService.downloadKML(routeData);
				Notifications.success("Archivo KML descargado");
				break;

			case "google":
				ExportService.openInGoogleMaps(routeData);
				Notifications.info("Abriendo Google Maps...");
				break;

			case "apple":
				ExportService.openInAppleMaps(routeData);
				Notifications.info("Abriendo Apple Maps...");
				break;

			case "share":
				const shared = await ExportService.share(routeData, "gpx");
				if (shared) {
					Notifications.success("Recorrido compartido");
				}
				break;

			default:
				console.warn("Unknown export action:", action);
		}
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

		// Update GPS indicator based on accuracy
		this.#updateGpsIndicator(pos.accuracy);

		const isFirstPoint = this.#currentRoute.getPointCount() === 0;

		// Agregar punto
		this.#currentRoute.addPoint(pos.lat, pos.lng);

		// Update movement heading for compass
		this.#updateMovementHeading();

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
		this.#setStatus("Error de GPS", "stopped");
		// Update GPS indicator to show error
		this.#updateGpsIndicator(999); // Very high value to show offline
	}

	/**
	 * Maneja inicio de tracking.
	 *
	 * @private
	 * @returns {void}
	 */
	async #onTrackingStarted() {
		this.#isTrackingActive = true;
		this.#isPaused = false;
		this.#trackingStartTime = Date.now();
		this.#pausedTimeAccumulated = 0;
		this.#setButtonsState(true);
		this.#setStatus("Rastreando...", "active");

		// Iniciar timer para actualizar tiempo cada segundo
		this.#startTimer();

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
		this.#isPaused = false;
		this.#setButtonsState(false);
		this.#setStatus("Detenido", "stopped");

		// Detener timer
		this.#stopTimer();

		// Reset GPS indicator to searching state
		this.#updateGpsIndicator(null);

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
	 * Verifica si el tracking está pausado.
	 *
	 * @returns {boolean} True si está pausado
	 */
	isPaused() {
		return this.#isPaused;
	}

	/**
	 * Alterna entre pausar y reanudar el tracking.
	 */
	togglePause() {
		if (this.#isPaused) {
			this.resumeTracking();
		} else {
			this.pauseTracking();
		}
	}

	/**
	 * Pausa el tracking actual.
	 */
	pauseTracking() {
		if (!this.#isTrackingActive || this.#isPaused) return;

		this.#isPaused = true;

		// Guardar tiempo transcurrido hasta ahora
		this.#pausedTimeAccumulated += Date.now() - this.#trackingStartTime;

		// Detener GPS (pero no finalizar la ruta - no emitir evento)
		if (this.#simulationMode && this.#simulator) {
			this.#simulator.stop();
		} else {
			this.#geoService.stopWatching({ emitEvent: false });
		}

		// Detener timer
		this.#stopTimer();

		// Actualizar UI
		this.#updatePauseButton(true);
		this.#setStatus("Pausado", "paused");
		Notifications.info("Tracking pausado");
	}

	/**
	 * Reanuda el tracking pausado.
	 */
	resumeTracking() {
		if (!this.#isTrackingActive || !this.#isPaused) return;

		this.#isPaused = false;

		// Reiniciar timestamp desde ahora
		this.#trackingStartTime = Date.now();

		// Reactivar GPS
		if (this.#simulationMode && this.#simulator) {
			this.#simulator.start((position) => {
				EventBus.emit("location:updated", position);
			});
		} else {
			this.#geoService.startWatching(
				(pos) => {},
				(err) => {},
			);
		}

		// Reiniciar timer
		this.#startTimer();

		// Actualizar UI
		this.#updatePauseButton(false);
		this.#setStatus("Rastreando...", "active");
		Notifications.success("Tracking reanudado");
	}

	/**
	 * Actualiza el botón de pausa según el estado.
	 *
	 * @private
	 * @param {boolean} isPaused - Si está pausado
	 */
	#updatePauseButton(isPaused) {
		const { startBtn, trackingActions, pauseBtn, resumeBtn, waypointBtn } =
			this.#elements;

		// While tracking:
		// - trackingActions always visible
		// - Inside: pauseBtn or resumeBtn (toggle based on isPaused)
		// - finishBtn always visible
		if (startBtn) startBtn.classList.add("fab--hidden");
		if (trackingActions) trackingActions.style.display = "flex";

		// Toggle pause/resume using CSS classes for reliable hiding
		// Also toggle disabled state
		if (pauseBtn) {
			pauseBtn.classList.toggle("fab--hidden", isPaused);
			pauseBtn.disabled = isPaused;
		}
		if (resumeBtn) {
			resumeBtn.classList.toggle("fab--hidden", !isPaused);
			resumeBtn.disabled = !isPaused;
		}

		// Keep waypoint button visible while tracking (paused or active)
		if (waypointBtn) waypointBtn.style.display = "flex";
	}

	/**
	 * Actualiza estadísticas en pantalla.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateStats() {
		if (!this.#currentRoute) {
			// Reset displays si no hay ruta
			if (this.#elements.distanceDisplay)
				this.#elements.distanceDisplay.textContent = "0.00";
			if (this.#elements.pointsDisplay)
				this.#elements.pointsDisplay.textContent = "0";
			if (this.#elements.elapsedTimeDisplay)
				this.#elements.elapsedTimeDisplay.textContent = "00:00:00";
			if (this.#elements.speedDisplay)
				this.#elements.speedDisplay.textContent = "0.0";
			return;
		}

		const distance = this.#currentRoute.getDistance();
		const points = this.#currentRoute.getPointCount();
		const speed = this.#currentRoute.getCurrentSpeed();

		if (this.#elements.distanceDisplay) {
			this.#elements.distanceDisplay.textContent = distance.toFixed(2);
		}

		if (this.#elements.pointsDisplay) {
			this.#elements.pointsDisplay.textContent = points.toString();
		}

		if (this.#elements.speedDisplay) {
			this.#elements.speedDisplay.textContent = speed.toFixed(1);
		}
	}

	/**
	 * Inicia el timer para actualizar el tiempo transcurrido.
	 *
	 * @private
	 */
	#startTimer() {
		if (this.#timerInterval) {
			clearInterval(this.#timerInterval);
		}

		this.#timerInterval = setInterval(() => {
			this.#updateElapsedTime();
		}, 1000);
	}

	/**
	 * Detiene el timer.
	 *
	 * @private
	 */
	#stopTimer() {
		if (this.#timerInterval) {
			clearInterval(this.#timerInterval);
			this.#timerInterval = null;
		}
	}

	/**
	 * Actualiza el display de tiempo transcurrido.
	 *
	 * @private
	 */
	#updateElapsedTime() {
		if (!this.#elements.elapsedTimeDisplay) return;

		// Tiempo total = acumulado + tiempo desde último inicio (si no está pausado)
		let elapsed = this.#pausedTimeAccumulated;
		if (!this.#isPaused) {
			elapsed += Date.now() - this.#trackingStartTime;
		}

		const totalSeconds = Math.floor(elapsed / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const formatted = [
			hours.toString().padStart(2, "0"),
			minutes.toString().padStart(2, "0"),
			seconds.toString().padStart(2, "0"),
		].join(":");

		this.#elements.elapsedTimeDisplay.textContent = formatted;
	}

	/**
	 * Actualiza estado de botones.
	 *
	 * @private
	 * @param {boolean} isTracking - Si está en tracking
	 * @returns {void}
	 */
	#setButtonsState(isTracking) {
		const {
			startBtn,
			trackingActions,
			pauseBtn,
			resumeBtn,
			saveBtn,
			exportBtn,
			waypointBtn,
		} = this.#elements;

		if (startBtn) startBtn.disabled = isTracking;
		if (pauseBtn) pauseBtn.disabled = !isTracking;
		if (resumeBtn) resumeBtn.disabled = !isTracking;
		if (saveBtn) saveBtn.disabled = isTracking;
		if (exportBtn) exportBtn.disabled = isTracking;

		// Mostrar/ocultar FAB buttons usando clases CSS
		if (startBtn) startBtn.classList.toggle("fab--hidden", isTracking);
		if (trackingActions)
			trackingActions.style.display = isTracking ? "flex" : "none";
		// Within trackingActions: pauseBtn visible when tracking starts (not paused yet)
		if (pauseBtn) pauseBtn.classList.toggle("fab--hidden", !isTracking);
		if (resumeBtn) resumeBtn.classList.add("fab--hidden");
		// Waypoint button only visible during tracking
		if (waypointBtn) waypointBtn.style.display = isTracking ? "flex" : "none";
	}

	/**
	 * Actualiza texto de estado.
	 *
	 * @private
	 * @param {string} text - Texto de estado
	 * @param {'idle'|'active'|'paused'|'stopped'} [state='idle'] - Estado del indicador
	 * @returns {void}
	 */
	#setStatus(text, state = "idle") {
		if (this.#elements.statusDisplay) {
			this.#elements.statusDisplay.textContent = text;
		}

		// Update status indicator classes
		if (this.#elements.statusIndicator) {
			const indicator = this.#elements.statusIndicator;
			indicator.classList.remove(
				"status-indicator--active",
				"status-indicator--paused",
				"status-indicator--stopped",
			);

			if (state === "active") {
				indicator.classList.add("status-indicator--active");
			} else if (state === "paused") {
				indicator.classList.add("status-indicator--paused");
			} else if (state === "stopped") {
				indicator.classList.add("status-indicator--stopped");
			}
		}
	}

	/**
	 * Inicializa el monitoreo de conectividad (Red y GPS).
	 *
	 * @private
	 * @returns {void}
	 */
	#initConnectivityMonitoring() {
		// Monitor network connectivity
		this.#updateNetworkIndicator(navigator.onLine);

		window.addEventListener("online", () => {
			this.#updateNetworkIndicator(true);
		});

		window.addEventListener("offline", () => {
			this.#updateNetworkIndicator(false);
		});

		// Initial GPS state (searching until first fix)
		this.#updateGpsIndicator(null);
	}

	/**
	 * Actualiza el indicador de red.
	 *
	 * @private
	 * @param {boolean} isOnline - Si hay conexión a internet
	 * @returns {void}
	 */
	#updateNetworkIndicator(isOnline) {
		const { networkIndicator } = this.#elements;
		if (!networkIndicator) return;

		networkIndicator.classList.remove(
			"connection-indicator--online",
			"connection-indicator--offline",
			"connection-indicator--searching",
		);

		if (isOnline) {
			networkIndicator.classList.add("connection-indicator--online");
			networkIndicator.title = "Conectado a internet";
		} else {
			networkIndicator.classList.add("connection-indicator--offline");
			networkIndicator.title = "Sin conexión a internet";
		}
	}

	/**
	 * Actualiza el indicador de GPS basado en la precisión.
	 *
	 * @private
	 * @param {number|null} accuracy - Precisión en metros (null = buscando)
	 * @returns {void}
	 */
	#updateGpsIndicator(accuracy) {
		const { gpsIndicator } = this.#elements;
		if (!gpsIndicator) return;

		gpsIndicator.classList.remove(
			"connection-indicator--online",
			"connection-indicator--offline",
			"connection-indicator--searching",
		);

		// Get or create accuracy element
		let accuracyEl = gpsIndicator.querySelector(
			".connection-indicator__accuracy",
		);
		if (!accuracyEl) {
			accuracyEl = document.createElement("span");
			accuracyEl.className = "connection-indicator__accuracy";
			gpsIndicator.appendChild(accuracyEl);
		}

		if (accuracy === null) {
			// Searching for GPS
			gpsIndicator.classList.add("connection-indicator--searching");
			gpsIndicator.title = "Buscando señal GPS...";
			accuracyEl.textContent = "";
		} else if (accuracy <= 10) {
			// Excellent signal (< 10m accuracy)
			gpsIndicator.classList.add("connection-indicator--online");
			gpsIndicator.title = `GPS: Señal excelente (±${Math.round(accuracy)}m)`;
			accuracyEl.textContent = `±${Math.round(accuracy)}m`;
		} else if (accuracy <= 30) {
			// Good signal (10-30m)
			gpsIndicator.classList.add("connection-indicator--online");
			gpsIndicator.title = `GPS: Señal buena (±${Math.round(accuracy)}m)`;
			accuracyEl.textContent = `±${Math.round(accuracy)}m`;
		} else if (accuracy <= 100) {
			// Weak signal (30-100m)
			gpsIndicator.classList.add("connection-indicator--searching");
			gpsIndicator.title = `GPS: Señal débil (±${Math.round(accuracy)}m)`;
			accuracyEl.textContent = `±${Math.round(accuracy)}m`;
		} else {
			// Very weak/no signal (>100m)
			gpsIndicator.classList.add("connection-indicator--offline");
			gpsIndicator.title = `GPS: Señal muy débil (±${Math.round(accuracy)}m)`;
			accuracyEl.textContent = `±${Math.round(accuracy)}m`;
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
		this.#setStatus("Listo para iniciar");
		this.#updateStats();
	}

	/**
	 * Muestra el modal para agregar waypoint.
	 *
	 * @private
	 * @returns {void}
	 */
	#showWaypointModal() {
		const { waypointModal, waypointNameInput } = this.#elements;
		if (waypointModal) {
			waypointModal.style.display = "flex";
			waypointNameInput?.focus();
		}
	}

	/**
	 * Oculta el modal de waypoint.
	 *
	 * @private
	 * @returns {void}
	 */
	#hideWaypointModal() {
		const { waypointModal, waypointNameInput } = this.#elements;
		if (waypointModal) {
			waypointModal.style.display = "none";
			if (waypointNameInput) waypointNameInput.value = "";
		}
	}

	/**
	 * Guarda el waypoint actual.
	 *
	 * @private
	 * @returns {void}
	 */
	#saveWaypoint() {
		const { waypointNameInput } = this.#elements;
		const name = waypointNameInput?.value?.trim();

		if (!name) {
			Notifications.warning("Ingresa un nombre para el punto");
			return;
		}

		if (!this.#currentRoute) {
			Notifications.error("No hay ruta activa");
			this.#hideWaypointModal();
			return;
		}

		// Get current position from last point
		const lastPoint = this.#currentRoute.getLastPoint();
		if (!lastPoint) {
			Notifications.error("No hay posición disponible");
			this.#hideWaypointModal();
			return;
		}

		// Add waypoint to route
		const waypoint = this.#currentRoute.addWaypoint(
			lastPoint.lat,
			lastPoint.lng,
			name,
		);

		// Add marker to map
		this.#addWaypointMarker(waypoint);

		Notifications.success(`Punto marcado: ${name}`);
		this.#hideWaypointModal();
	}

	/**
	 * Agrega un marcador de waypoint al mapa.
	 *
	 * @private
	 * @param {Object} waypoint - Datos del waypoint
	 * @returns {void}
	 */
	#addWaypointMarker(waypoint) {
		if (!this.#mapService) return;

		const map = this.#mapService.getNativeMap();
		if (!map) return;

		// Custom icon for waypoint
		const waypointIcon = L.divIcon({
			className: "waypoint-marker",
			html: `<div class="waypoint-marker__pin">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b" stroke="#fff" stroke-width="2">
					<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
					<circle cx="12" cy="10" r="3" fill="#fff"/>
				</svg>
			</div>`,
			iconSize: [24, 24],
			iconAnchor: [12, 24],
			popupAnchor: [0, -24],
		});

		const marker = L.marker([waypoint.lat, waypoint.lng], {
			icon: waypointIcon,
		})
			.addTo(map)
			.bindPopup(`<strong>${waypoint.name}</strong>`);

		this.#waypointMarkers.push(marker);
	}

	/**
	 * Limpia los marcadores de waypoints del mapa.
	 *
	 * @private
	 * @returns {void}
	 */
	#clearWaypointMarkers() {
		const map = this.#mapService?.getNativeMap();
		if (map) {
			this.#waypointMarkers.forEach((marker) => map.removeLayer(marker));
		}
		this.#waypointMarkers = [];
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
		this.#clearWaypointMarkers();
		this.#mapService.clear();
		this.#updateStats();
		this.#setStatus("Listo para iniciar");
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
		const { startBtn, saveBtn, exportBtn } = this.#elements;

		if (viewOnly) {
			if (startBtn) startBtn.style.display = "none";
			if (saveBtn) saveBtn.style.display = "none";
			if (exportBtn) {
				exportBtn.disabled = false;
				exportBtn.style.display = "inline-flex";
			}
		} else {
			this.#setButtonsState(false);
		}
	}

	// ========================================
	// EXIT/RESUME MODAL METHODS
	// ========================================

	/**
	 * Muestra el modal de salida.
	 *
	 * @private
	 * @returns {void}
	 */
	#showExitModal() {
		const { exitModal } = this.#elements;
		if (exitModal) {
			exitModal.style.display = "flex";
		}
	}

	/**
	 * Oculta el modal de salida.
	 *
	 * @private
	 * @returns {void}
	 */
	#hideExitModal() {
		const { exitModal } = this.#elements;
		if (exitModal) {
			exitModal.style.display = "none";
		}
	}

	/**
	 * Maneja el evento de guardar y salir.
	 *
	 * @private
	 * @returns {void}
	 */
	#handleExitSave() {
		this.#savePendingRoute();
		this.#hideExitModal();
		Notifications.success("Recorrido guardado. Puedes retomarlo más tarde.");
	}

	/**
	 * Maneja el evento de descartar al salir.
	 *
	 * @private
	 * @returns {void}
	 */
	#handleExitDiscard() {
		this.#clearPendingRoute();
		this.#hideExitModal();
		this.stopTracking();
		Notifications.info("Recorrido descartado");
	}

	/**
	 * Detecta cambios de visibilidad de la página.
	 *
	 * @private
	 * @returns {void}
	 */
	#onVisibilityChange() {
		if (document.visibilityState === "hidden" && this.#isTrackingActive) {
			// Auto-save when page loses visibility during tracking
			this.#savePendingRoute();
		}
	}

	/**
	 * Maneja el evento beforeunload.
	 *
	 * @private
	 * @param {BeforeUnloadEvent} e - Evento
	 * @returns {string|undefined}
	 */
	#onBeforeUnload(e) {
		if (this.#isTrackingActive) {
			// Auto-save before leaving
			this.#savePendingRoute();
			// Show browser's native confirmation
			e.preventDefault();
			e.returnValue = "Tienes un recorrido en progreso";
			return e.returnValue;
		}
	}

	/**
	 * Guarda la ruta actual como pendiente en localStorage.
	 *
	 * @private
	 * @returns {void}
	 */
	#savePendingRoute() {
		if (!this.#currentRoute) return;

		// Calculate elapsed time in milliseconds
		let elapsedMs = this.#pausedTimeAccumulated;
		if (!this.#isPaused && this.#trackingStartTime > 0) {
			elapsedMs += Date.now() - this.#trackingStartTime;
		}

		const pendingData = {
			name: this.#currentRoute.name,
			points: this.#currentRoute.points,
			waypoints: this.#currentRoute.waypoints,
			startTime: this.#currentRoute.startTime,
			elapsedTime: elapsedMs,
			savedAt: Date.now(),
		};

		try {
			localStorage.setItem(
				"tracking_pending_route",
				JSON.stringify(pendingData),
			);
		} catch (err) {
			console.error("Error saving pending route:", err);
		}
	}

	/**
	 * Carga la ruta pendiente desde localStorage.
	 *
	 * @private
	 * @returns {Object|null} Datos de la ruta pendiente o null
	 */
	#loadPendingRoute() {
		try {
			const data = localStorage.getItem("tracking_pending_route");
			return data ? JSON.parse(data) : null;
		} catch (err) {
			console.error("Error loading pending route:", err);
			return null;
		}
	}

	/**
	 * Elimina la ruta pendiente de localStorage.
	 *
	 * @private
	 * @returns {void}
	 */
	#clearPendingRoute() {
		try {
			localStorage.removeItem("tracking_pending_route");
		} catch (err) {
			console.error("Error clearing pending route:", err);
		}
	}

	/**
	 * Restaura el estado desde una ruta pendiente.
	 *
	 * @private
	 * @param {Object} pendingData - Datos de la ruta pendiente
	 * @returns {void}
	 */
	#restoreFromPendingRoute(pendingData) {
		// Clear map
		this.#mapService.clear();
		this.#startMarker = null;
		this.#currentMarker = null;

		// Restore route
		this.#currentRoute = new Route(pendingData.name);
		this.#currentRoute.startTime = pendingData.startTime;

		// Restore points
		if (pendingData.points?.length > 0) {
			for (const point of pendingData.points) {
				this.#currentRoute.addPoint(point.lat, point.lng);
			}

			// Draw polyline
			this.#mapService.updatePolyline(this.#currentRoute.points);

			// Add start marker
			const firstPoint = this.#currentRoute.points[0];
			this.#startMarker = this.#mapService.addStartMarker(firstPoint, "Inicio");

			// Add current position marker
			const lastPoint =
				this.#currentRoute.points[this.#currentRoute.points.length - 1];
			this.#currentMarker = this.#mapService.addCurrentMarker(lastPoint);

			// Center on last point
			this.#mapService.centerOn(lastPoint, 19);
		}

		// Restore waypoints
		if (pendingData.waypoints?.length > 0) {
			for (const wp of pendingData.waypoints) {
				const waypoint = this.#currentRoute.addWaypoint(
					wp.lat,
					wp.lng,
					wp.name,
				);
				this.#addWaypointMarker(waypoint);
			}
		}

		// Restore elapsed time - set accumulated time and reset start time
		this.#pausedTimeAccumulated = pendingData.elapsedTime || 0;
		this.#trackingStartTime = Date.now();

		// Update UI
		if (this.#elements.routeNameInput) {
			this.#elements.routeNameInput.value = pendingData.name;
		}
		this.#updateStats();

		// Start tracking again
		this.#isTrackingActive = true;
		this.#isPaused = false;
		this.#setButtonsState(true);
		this.#setStatus("Reanudando...");
		this.#startTimer();

		// Start geolocation
		this.#geoService?.startWatching(
			(pos) => {}, // Eventos manejados por EventBus
			(err) => {},
		);
		this.#wakeLockService?.request();

		EventBus.emit("tracking:started");
		Notifications.success("Recorrido reanudado");
	}

	/**
	 * Verifica si se debe reanudar una ruta pendiente (vía parámetro URL).
	 *
	 * @private
	 * @returns {void}
	 */
	#checkForPendingRoute() {
		const urlParams = new URLSearchParams(window.location.search);
		const shouldResume = urlParams.get("resume") === "true";

		if (!shouldResume) return;

		const pendingData = this.#loadPendingRoute();

		if (pendingData && pendingData.points?.length > 0) {
			// Check if it's not too old (24 hours max)
			const maxAge = 24 * 60 * 60 * 1000;
			const age = Date.now() - pendingData.savedAt;

			if (age < maxAge) {
				// Restore directly without modal
				this.#restoreFromPendingRoute(pendingData);
				this.#clearPendingRoute();
				// Clean URL parameter
				window.history.replaceState({}, "", window.location.pathname);
			} else {
				// Too old, clean up
				this.#clearPendingRoute();
			}
		}
	}

	// ========================================
	// COMPASS METHODS
	// ========================================

	/**
	 * Inicializa la brújula.
	 *
	 * @private
	 * @returns {void}
	 */
	#initCompass() {
		// Check for device orientation support
		if ("DeviceOrientationEvent" in window) {
			// iOS 13+ requires permission
			if (typeof DeviceOrientationEvent.requestPermission === "function") {
				// Will request on first interaction
				this.#elements.compass?.addEventListener(
					"click",
					() => this.#requestCompassPermission(),
					{ once: true },
				);
				this.#elements.compass?.classList.add("compass--calibrating");
			} else {
				// Android and other browsers
				this.#startCompassListener();
			}
		} else {
			this.#elements.compass?.classList.add("compass--unavailable");
			if (this.#elements.compassLabel) {
				this.#elements.compassLabel.textContent = "No disponible";
			}
		}
	}

	/**
	 * Solicita permiso para la brújula en iOS.
	 *
	 * @private
	 * @returns {Promise<void>}
	 */
	async #requestCompassPermission() {
		try {
			const permission = await DeviceOrientationEvent.requestPermission();
			if (permission === "granted") {
				this.#startCompassListener();
				this.#elements.compass?.classList.remove("compass--calibrating");
			} else {
				this.#elements.compass?.classList.add("compass--unavailable");
				Notifications.warning("Permiso de brújula denegado");
			}
		} catch (err) {
			console.error("Error requesting compass permission:", err);
			this.#elements.compass?.classList.add("compass--unavailable");
		}
	}

	/**
	 * Inicia el listener de orientación del dispositivo.
	 *
	 * @private
	 * @returns {void}
	 */
	#startCompassListener() {
		this.#compassSupported = true;
		this.#elements.compass?.classList.remove("compass--calibrating");

		window.addEventListener(
			"deviceorientationabsolute",
			(e) => this.#onDeviceOrientation(e),
			true,
		);

		// Fallback to regular deviceorientation
		window.addEventListener(
			"deviceorientation",
			(e) => this.#onDeviceOrientation(e),
			true,
		);
	}

	/**
	 * Maneja el evento de orientación del dispositivo.
	 *
	 * @private
	 * @param {DeviceOrientationEvent} event - Evento de orientación
	 * @returns {void}
	 */
	#onDeviceOrientation(event) {
		let heading = null;

		// webkitCompassHeading is iOS specific and already compensated
		if (event.webkitCompassHeading !== undefined) {
			heading = event.webkitCompassHeading;
		} else if (event.alpha !== null) {
			// For Android, alpha is the compass direction
			// alpha: 0 = North, 90 = East, 180 = South, 270 = West
			heading = event.absolute ? 360 - event.alpha : event.alpha;
		}

		if (heading !== null) {
			this.#deviceHeading = heading;
			this.#updateCompassUI();
		}
	}

	/**
	 * Calcula el bearing entre dos puntos GPS.
	 *
	 * @private
	 * @param {Object} from - Punto de origen {lat, lng}
	 * @param {Object} to - Punto de destino {lat, lng}
	 * @returns {number} Bearing en grados (0-360)
	 */
	#calculateBearing(from, to) {
		const lat1 = (from.lat * Math.PI) / 180;
		const lat2 = (to.lat * Math.PI) / 180;
		const dLng = ((to.lng - from.lng) * Math.PI) / 180;

		const y = Math.sin(dLng) * Math.cos(lat2);
		const x =
			Math.cos(lat1) * Math.sin(lat2) -
			Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

		let bearing = (Math.atan2(y, x) * 180) / Math.PI;
		return (bearing + 360) % 360;
	}

	/**
	 * Actualiza el heading de movimiento basado en los últimos puntos GPS.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateMovementHeading() {
		if (!this.#currentRoute || this.#currentRoute.points.length < 2) {
			this.#movementHeading = null;
			return;
		}

		const points = this.#currentRoute.points;
		const from = points[points.length - 2];
		const to = points[points.length - 1];

		// Only update if there's significant movement (> 2 meters)
		const distance = this.#calculateDistance(from, to);
		if (distance > 0.002) {
			// 2 meters in km
			this.#movementHeading = this.#calculateBearing(from, to);
		}

		this.#updateCompassUI();
	}

	/**
	 * Calcula distancia entre dos puntos (simplificado).
	 *
	 * @private
	 * @param {Object} from - Punto de origen
	 * @param {Object} to - Punto de destino
	 * @returns {number} Distancia en km
	 */
	#calculateDistance(from, to) {
		const R = 6371; // Radio de la Tierra en km
		const dLat = ((to.lat - from.lat) * Math.PI) / 180;
		const dLng = ((to.lng - from.lng) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((from.lat * Math.PI) / 180) *
				Math.cos((to.lat * Math.PI) / 180) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	/**
	 * Actualiza la UI de la brújula.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateCompassUI() {
		const { compassNeedle, compassHeading, compassDegrees, compassLabel } =
			this.#elements;

		// Update needle rotation (points to north)
		if (compassNeedle && this.#deviceHeading !== null) {
			compassNeedle.style.transform = `rotate(${-this.#deviceHeading}deg)`;
		}

		// Update movement direction indicator
		if (compassHeading && this.#movementHeading !== null) {
			compassHeading.style.display = "block";
			// Rotate relative to device heading if available
			const rotation =
				this.#deviceHeading !== null
					? this.#movementHeading - this.#deviceHeading
					: this.#movementHeading;
			compassHeading.style.transform = `rotate(${rotation}deg)`;
		} else if (compassHeading) {
			compassHeading.style.display = "none";
		}

		// Update degrees display - show movement heading when tracking
		const displayHeading =
			this.#isTrackingActive && this.#movementHeading !== null
				? this.#movementHeading
				: this.#deviceHeading;

		if (compassDegrees) {
			if (displayHeading !== null) {
				compassDegrees.textContent = `${Math.round(displayHeading)}°`;
			} else {
				compassDegrees.textContent = "--°";
			}
		}

		// Update cardinal direction label
		if (compassLabel && displayHeading !== null) {
			compassLabel.textContent = this.#getCardinalDirection(displayHeading);
		}
	}

	/**
	 * Convierte grados a dirección cardinal.
	 *
	 * @private
	 * @param {number} degrees - Grados (0-360)
	 * @returns {string} Dirección cardinal (N, NE, E, etc.)
	 */
	#getCardinalDirection(degrees) {
		const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
		const index = Math.round(degrees / 45) % 8;
		return directions[index];
	}
}

export default UIController;
