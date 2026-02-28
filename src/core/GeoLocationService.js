/**
 * @fileoverview GeoLocationService - Servicio de geolocalización GPS
 * @module core/GeoLocationService
 * @description Wrapper de la API de Geolocation que provee tracking continuo
 * y manejo de errores. Emite eventos via EventBus.
 *
 * @example
 * import { GeoLocationService } from './core/GeoLocationService.js';
 *
 * const geo = new GeoLocationService();
 * geo.startWatching(
 *   (pos) => console.log(pos),
 *   (err) => console.error(err)
 * );
 */

import { EventBus } from "./EventBus.js";

/**
 * @typedef {Object} Position
 * @property {number} lat - Latitud en grados decimales
 * @property {number} lng - Longitud en grados decimales
 * @property {number} [accuracy] - Precisión en metros
 * @property {number} [timestamp] - Unix timestamp
 */

/**
 * @typedef {Object} GeoError
 * @property {number} code - Código de error (0-3)
 * @property {string} message - Mensaje descriptivo
 */

/**
 * @typedef {Object} GeoOptions
 * @property {boolean} [enableHighAccuracy=true] - Usar alta precisión
 * @property {number} [timeout=10000] - Timeout en ms
 * @property {number} [maximumAge=0] - Edad máxima de cache
 */

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
 * Servicio de geolocalización GPS.
 * Implementa Single Responsibility: solo manejo de GPS.
 *
 * @class GeoLocationService
 */
export class GeoLocationService {
	/** @type {number|null} ID del watcher */
	#watchId = null;

	/** @type {GeoOptions} Opciones de geolocalización */
	#options = {
		enableHighAccuracy: true,
		timeout: 10000,
		maximumAge: 0,
	};

	/** @type {boolean} Estado de tracking */
	#isTracking = false;

	/**
	 * Crea una nueva instancia de GeoLocationService.
	 *
	 * @param {GeoOptions} [options={}] - Opciones de configuración
	 */
	constructor(options = {}) {
		this.#options = { ...this.#options, ...options };
	}

	/**
	 * Verifica si la geolocalización está soportada.
	 *
	 * @returns {boolean} True si está soportada
	 */
	isSupported() {
		return "geolocation" in navigator;
	}

	/**
	 * Verifica si el tracking está activo.
	 *
	 * @returns {boolean} True si está en tracking
	 */
	isTracking() {
		return this.#isTracking;
	}

	/**
	 * Inicia el seguimiento continuo de posición.
	 *
	 * @param {PositionCallback} onSuccess - Callback para nuevas posiciones
	 * @param {ErrorCallback} onError - Callback para errores
	 * @returns {boolean} True si se inició correctamente
	 */
	startWatching(onSuccess, onError) {
		if (!this.isSupported()) {
			const error = { code: 0, message: "Geolocalización no soportada" };
			onError(error);
			EventBus.emit("location:error", error);
			return false;
		}

		if (this.#isTracking) {
			return true;
		}

		this.#watchId = navigator.geolocation.watchPosition(
			(position) => {
				const pos = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy: position.coords.accuracy,
					timestamp: position.timestamp,
				};
				onSuccess(pos);
				EventBus.emit("location:updated", pos);
			},
			(error) => {
				const geoError = {
					code: error.code,
					message: this.#getErrorMessage(error),
				};
				onError(geoError);
				EventBus.emit("location:error", geoError);
			},
			this.#options,
		);

		this.#isTracking = true;
		EventBus.emit("tracking:started", { timestamp: Date.now() });
		return true;
	}

	/**
	 * Detiene el seguimiento de posición.
	 *
	 * @param {Object} [options] - Opciones
	 * @param {boolean} [options.emitEvent=true] - Si debe emitir evento tracking:stopped
	 * @returns {void}
	 */
	stopWatching({ emitEvent = true } = {}) {
		if (this.#watchId !== null) {
			navigator.geolocation.clearWatch(this.#watchId);
			this.#watchId = null;
			this.#isTracking = false;
			if (emitEvent) {
				EventBus.emit("tracking:stopped", { timestamp: Date.now() });
			}
		}
	}

	/**
	 * Obtiene la posición actual una sola vez.
	 *
	 * @returns {Promise<Position>} Promesa con la posición
	 * @throws {GeoError} Si hay error de geolocalización
	 */
	getCurrentPosition() {
		return new Promise((resolve, reject) => {
			if (!this.isSupported()) {
				reject({ code: 0, message: "Geolocalización no soportada" });
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						lat: position.coords.latitude,
						lng: position.coords.longitude,
						accuracy: position.coords.accuracy,
						timestamp: position.timestamp,
					});
				},
				(error) => {
					reject({
						code: error.code,
						message: this.#getErrorMessage(error),
					});
				},
				this.#options,
			);
		});
	}

	/**
	 * Actualiza las opciones de geolocalización.
	 *
	 * @param {GeoOptions} options - Nuevas opciones
	 * @returns {void}
	 */
	setOptions(options) {
		this.#options = { ...this.#options, ...options };
	}

	/**
	 * Obtiene mensaje de error legible.
	 *
	 * @private
	 * @param {GeolocationPositionError} error - Error nativo
	 * @returns {string} Mensaje descriptivo
	 */
	#getErrorMessage(error) {
		const messages = {
			1: "Permiso de ubicación denegado. Por favor habilita el acceso a tu ubicación.",
			2: "Ubicación no disponible. Verifica tu conexión GPS.",
			3: "Timeout al obtener ubicación. Intenta de nuevo.",
		};
		return messages[error.code] || "Error desconocido de geolocalización";
	}
}

export default GeoLocationService;
