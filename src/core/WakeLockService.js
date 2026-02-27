/**
 * @fileoverview WakeLockService - Servicio para mantener pantalla activa
 * @module core/WakeLockService
 * @description Usa la Screen Wake Lock API para evitar que la pantalla
 * se apague durante el tracking. También detecta cuando la app va a background.
 *
 * @example
 * import { WakeLockService } from './core/WakeLockService.js';
 *
 * const wakeLock = new WakeLockService();
 * await wakeLock.request();
 * // ... tracking activo ...
 * wakeLock.release();
 */

import { EventBus } from "./EventBus.js";

/**
 * Servicio de Wake Lock para mantener la pantalla activa.
 * También monitorea el estado de visibilidad de la app.
 *
 * @class WakeLockService
 */
export class WakeLockService {
	/** @type {WakeLockSentinel|null} Instancia del wake lock */
	#wakeLock = null;

	/** @type {boolean} Si el wake lock está activo */
	#isActive = false;

	/** @type {boolean} Si la app está en background */
	#isBackground = false;

	/** @type {Function|null} Handler de visibilidad */
	#visibilityHandler = null;

	/**
	 * Crea una nueva instancia de WakeLockService.
	 */
	constructor() {
		this.#setupVisibilityListener();
	}

	/**
	 * Verifica si la API de Wake Lock está soportada.
	 *
	 * @returns {boolean} True si está soportada
	 */
	isSupported() {
		return "wakeLock" in navigator;
	}

	/**
	 * Solicita un wake lock para mantener la pantalla encendida.
	 *
	 * @returns {Promise<boolean>} True si se obtuvo el lock
	 */
	async request() {
		if (!this.isSupported()) {
			console.warn("⚠️ Wake Lock API no soportada en este navegador");
			EventBus.emit("wakelock:unsupported");
			return false;
		}

		try {
			this.#wakeLock = await navigator.wakeLock.request("screen");
			this.#isActive = true;

			// Escuchar cuando se libere el lock (por ejemplo, al cambiar de pestaña)
			this.#wakeLock.addEventListener("release", () => {
				this.#isActive = false;
				console.log("🔓 Wake Lock liberado");
				EventBus.emit("wakelock:released");
			});

			console.log("🔒 Wake Lock activo - Pantalla no se apagará");
			EventBus.emit("wakelock:acquired");
			return true;
		} catch (err) {
			console.error("Error al solicitar Wake Lock:", err);
			EventBus.emit("wakelock:error", { error: err });
			return false;
		}
	}

	/**
	 * Libera el wake lock.
	 *
	 * @returns {Promise<void>}
	 */
	async release() {
		if (this.#wakeLock) {
			await this.#wakeLock.release();
			this.#wakeLock = null;
			this.#isActive = false;
			console.log("🔓 Wake Lock liberado manualmente");
		}
	}

	/**
	 * Verifica si el wake lock está activo.
	 *
	 * @returns {boolean} True si está activo
	 */
	isActive() {
		return this.#isActive;
	}

	/**
	 * Verifica si la app está en background.
	 *
	 * @returns {boolean} True si está en background
	 */
	isInBackground() {
		return this.#isBackground;
	}

	/**
	 * Configura el listener de visibilidad.
	 *
	 * @private
	 */
	#setupVisibilityListener() {
		this.#visibilityHandler = async () => {
			if (document.visibilityState === "hidden") {
				this.#isBackground = true;
				console.log("📱 App en background - Tracking puede pausarse");
				EventBus.emit("app:background");
			} else {
				this.#isBackground = false;
				console.log("📱 App en primer plano");
				EventBus.emit("app:foreground");

				// Re-adquirir wake lock si estaba activo
				if (this.#isActive && !this.#wakeLock) {
					await this.request();
				}
			}
		};

		document.addEventListener("visibilitychange", this.#visibilityHandler);
	}

	/**
	 * Limpia los listeners.
	 */
	destroy() {
		if (this.#visibilityHandler) {
			document.removeEventListener("visibilitychange", this.#visibilityHandler);
		}
		this.release();
	}
}

export default WakeLockService;
