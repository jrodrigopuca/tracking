/**
 * @fileoverview App - Punto de entrada y composición de la aplicación
 * @module app
 * @description Inicializa y compone todos los servicios de la aplicación.
 * Implementa Dependency Inversion: inyecta dependencias a los controladores.
 *
 * @example
 * // En track.html:
 * <script type="module" src="./app.js"></script>
 */

import { MapService } from "./core/MapService.js";
import { GeoLocationService } from "./core/GeoLocationService.js";
import { StorageService } from "./core/StorageService.js";
import { EventBus } from "./core/EventBus.js";
import { UIController } from "./ui/UIController.js";
import { Notifications } from "./ui/Notifications.js";
import { Route } from "./models/Route.js";

/**
 * @typedef {Object} AppConfig
 * @property {string} mapContainerId - ID del contenedor del mapa
 * @property {string} storageKey - Clave para localStorage
 * @property {Object} mapOptions - Opciones del mapa
 */

/**
 * Configuración por defecto de la aplicación.
 * @type {AppConfig}
 */
const DEFAULT_CONFIG = {
	mapContainerId: "map",
	storageKey: "tracking_routes",
	mapOptions: {
		lat: -12.0464,
		lng: -77.0428,
		zoom: 18,
	},
};

/**
 * Clase principal de la aplicación.
 * Compone e inicializa todos los servicios.
 *
 * @class App
 */
class App {
	/** @type {MapService} */
	mapService;

	/** @type {GeoLocationService} */
	geoService;

	/** @type {StorageService} */
	storageService;

	/** @type {UIController} */
	uiController;

	/** @type {AppConfig} */
	#config;

	/**
	 * Crea una instancia de App.
	 *
	 * @param {Partial<AppConfig>} [config={}] - Configuración personalizada
	 */
	constructor(config = {}) {
		this.#config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Inicializa la aplicación.
	 * Crea servicios e inyecta dependencias.
	 *
	 * @returns {App} Instancia de la app
	 */
	init() {
		try {
			// Inicializar servicios core
			this.storageService = new StorageService(this.#config.storageKey);
			this.geoService = new GeoLocationService();
			this.mapService = new MapService(
				this.#config.mapContainerId,
				this.#config.mapOptions,
			);

			// Inicializar UI con dependencias inyectadas
			this.uiController = new UIController({
				mapService: this.mapService,
				geoService: this.geoService,
				storageService: this.storageService,
			});

			this.uiController.init();

			// Centrar mapa en ubicación del usuario
			this.#centerOnUserLocation();

			// Verificar si hay ruta para cargar desde URL
			this.#loadRouteFromURL();

			// Log para debugging
			console.log("🚀 Tracking App initialized");

			return this;
		} catch (error) {
			console.error("Error initializing app:", error);
			Notifications.error("Error al inicializar la aplicación");
			throw error;
		}
	}

	/**
	 * Centra el mapa en la ubicación actual del usuario.
	 * @private
	 */
	async #centerOnUserLocation() {
		try {
			const pos = await this.geoService.getCurrentPosition();
			this.mapService.centerOn(pos, 18);
			console.log("📍 Mapa centrado en ubicación del usuario");
		} catch (error) {
			console.warn("No se pudo obtener ubicación del usuario:", error.message);
		}
	}

	/**
	 * Carga una ruta desde el parámetro ID en la URL.
	 * @private
	 */
	#loadRouteFromURL() {
		const urlParams = new URLSearchParams(window.location.search);
		const routeId = urlParams.get("id");

		if (routeId) {
			this.uiController.loadRoute(routeId);
		}
	}

	/**
	 * Obtiene el servicio de mapa.
	 * @returns {MapService}
	 */
	getMapService() {
		return this.mapService;
	}

	/**
	 * Obtiene el servicio de geolocalización.
	 * @returns {GeoLocationService}
	 */
	getGeoService() {
		return this.geoService;
	}

	/**
	 * Obtiene el servicio de almacenamiento.
	 * @returns {StorageService}
	 */
	getStorageService() {
		return this.storageService;
	}
}

// Auto-inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
	// Verificar si estamos en la página de tracking
	const mapContainer = document.getElementById("map");

	if (mapContainer) {
		window.app = new App().init();
	}
});

// Exportar para uso externo y testing
export { App, EventBus, Route, Notifications };
export default App;
