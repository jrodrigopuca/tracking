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

	/** @type {boolean} Si el tracking está pausado */
	#isPaused = false;

	/** @type {number|null} Interval ID para actualizar tiempo */
	#timerInterval = null;

	/** @type {number} Timestamp de inicio del tracking */
	#trackingStartTime = 0;

	/** @type {number} Tiempo acumulado antes de pausar (ms) */
	#pausedTimeAccumulated = 0;

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
			pauseBtn: document.getElementById("btn-pause"),
			stopBtn: document.getElementById("btn-stop"),
			saveBtn: document.getElementById("btn-save"),
			exportBtn: document.getElementById("btn-export"),
			exportDropdown: document.getElementById("export-dropdown"),
			shareBtn: document.getElementById("btn-share"),
			shareDivider: document.getElementById("share-divider"),
			locationBtn: document.getElementById("btn-location"),
			distanceDisplay: document.getElementById("distance"),
			pointsDisplay: document.getElementById("points"),
			statusDisplay: document.getElementById("status"),
			routeNameInput: document.getElementById("route-name"),
			elapsedTimeDisplay: document.getElementById("elapsed-time"),
			speedDisplay: document.getElementById("speed"),
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
			stopBtn,
			saveBtn,
			exportBtn,
			exportDropdown,
			locationBtn,
		} = this.#elements;

		startBtn?.addEventListener("click", () => this.startTracking());
		pauseBtn?.addEventListener("click", () => this.togglePause());
		stopBtn?.addEventListener("click", () => this.stopTracking());
		saveBtn?.addEventListener("click", () => this.saveRoute());
		locationBtn?.addEventListener("click", () => this.goToMyLocation());

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
		this.#isPaused = false;
		this.#trackingStartTime = Date.now();
		this.#pausedTimeAccumulated = 0;
		this.#setButtonsState(true);
		this.#setStatus("Rastreando...");

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
		this.#setStatus("Detenido");

		// Detener timer
		this.#stopTimer();

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

		// Detener GPS (pero no finalizar la ruta)
		if (this.#simulationMode && this.#simulator) {
			this.#simulator.stop();
		} else {
			this.#geoService.stopWatching();
		}

		// Detener timer
		this.#stopTimer();

		// Actualizar UI
		this.#updatePauseButton(true);
		this.#setStatus("⏸ Pausado");
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
		this.#setStatus("Rastreando...");
		Notifications.success("Tracking reanudado");
	}

	/**
	 * Actualiza el botón de pausa según el estado.
	 *
	 * @private
	 * @param {boolean} isPaused - Si está pausado
	 */
	#updatePauseButton(isPaused) {
		const { pauseBtn } = this.#elements;
		if (!pauseBtn) return;

		if (isPaused) {
			pauseBtn.innerHTML = '<span class="btn__icon">▶</span> Reanudar';
			pauseBtn.classList.remove("btn--warning");
			pauseBtn.classList.add("btn--success");
		} else {
			pauseBtn.innerHTML = '<span class="btn__icon">⏸</span> Pausar';
			pauseBtn.classList.remove("btn--success");
			pauseBtn.classList.add("btn--warning");
		}
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
		const { startBtn, pauseBtn, stopBtn, saveBtn, exportBtn } = this.#elements;

		if (startBtn) startBtn.disabled = isTracking;
		if (pauseBtn) pauseBtn.disabled = !isTracking;
		if (stopBtn) stopBtn.disabled = !isTracking;
		if (saveBtn) saveBtn.disabled = isTracking;
		if (exportBtn) exportBtn.disabled = isTracking;

		// Mostrar/ocultar botones
		if (startBtn) startBtn.style.display = isTracking ? "none" : "inline-flex";
		if (pauseBtn) pauseBtn.style.display = isTracking ? "inline-flex" : "none";
		if (stopBtn) stopBtn.style.display = isTracking ? "inline-flex" : "none";

		// Resetear botón de pausa al estado inicial
		if (isTracking && pauseBtn) {
			this.#updatePauseButton(false);
		}
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
