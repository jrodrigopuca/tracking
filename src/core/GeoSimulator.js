/**
 * @fileoverview Simulador de GPS para testing y desarrollo.
 * Genera rutas realistas sin necesidad de GPS real.
 *
 * @module core/GeoSimulator
 */

/**
 * Simulador de geolocalización para testing.
 * Genera posiciones GPS simuladas siguiendo un patrón configurable.
 *
 * @example
 * const simulator = new GeoSimulator();
 * simulator.start((position) => {
 *   console.log(position); // { lat, lng, accuracy, timestamp }
 * });
 */
/**
 * Ciudades disponibles para simulación.
 * @type {Array<{name: string, lat: number, lng: number}>}
 */
const CITIES = [
	{ name: "Tokyo", lat: 35.6762, lng: 139.6503 },
	{ name: "London", lat: 51.5074, lng: -0.1278 },
	{ name: "New York", lat: 40.7128, lng: -74.006 },
	{ name: "Paris", lat: 48.8566, lng: 2.3522 },
	{ name: "Sydney", lat: -33.8688, lng: 151.2093 },
	{ name: "Dubai", lat: 25.2048, lng: 55.2708 },
	{ name: "Singapore", lat: 1.3521, lng: 103.8198 },
	{ name: "Barcelona", lat: 41.3851, lng: 2.1734 },
	{ name: "Berlin", lat: 52.52, lng: 13.405 },
	{ name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
	{ name: "Mexico City", lat: 19.4326, lng: -99.1332 },
	{ name: "Lima", lat: -12.0464, lng: -77.0428 },
	{ name: "Cairo", lat: 30.0444, lng: 31.2357 },
	{ name: "Mumbai", lat: 19.076, lng: 72.8777 },
	{ name: "Seoul", lat: 37.5665, lng: 126.978 },
];

export class GeoSimulator {
	/** @type {number|null} ID del interval */
	#intervalId = null;

	/** @type {Object} Posición actual */
	#currentPosition = null;

	/** @type {number} Dirección actual en radianes */
	#direction = 0;

	/** @type {Object|null} Ciudad seleccionada */
	#selectedCity = null;

	/** @type {Object} Configuración */
	#config = {
		/** Intervalo entre puntos en ms */
		interval: 1000,
		/** Velocidad en metros por segundo (caminando ~1.4 m/s) */
		speed: 1.4,
		/** Variación aleatoria de dirección (radianes) */
		directionVariance: 0.3,
		/** Precisión simulada en metros */
		accuracy: 10,
	};

	/**
	 * Crea una instancia del simulador.
	 *
	 * @param {Object} [startPosition] - Posición inicial (si es null, elige ciudad aleatoria)
	 * @param {number} [startPosition.lat] - Latitud inicial
	 * @param {number} [startPosition.lng] - Longitud inicial
	 * @param {Object} [config] - Configuración del simulador
	 */
	constructor(startPosition = null, config = {}) {
		if (startPosition) {
			this.#currentPosition = startPosition;
			this.#selectedCity = { name: "Custom", ...startPosition };
		} else {
			// Elegir ciudad aleatoria
			this.#selectedCity = CITIES[Math.floor(Math.random() * CITIES.length)];
			this.#currentPosition = {
				lat: this.#selectedCity.lat,
				lng: this.#selectedCity.lng,
			};
		}
		this.#config = { ...this.#config, ...config };
		this.#direction = Math.random() * 2 * Math.PI;
	}

	/**
	 * Obtiene la ciudad seleccionada.
	 *
	 * @returns {Object} Ciudad con name, lat, lng
	 */
	getSelectedCity() {
		return { ...this.#selectedCity };
	}

	/**
	 * Obtiene la posición inicial.
	 *
	 * @returns {Object} Posición {lat, lng}
	 */
	getStartPosition() {
		return {
			lat: this.#selectedCity.lat,
			lng: this.#selectedCity.lng,
		};
	}

	/**
	 * Inicia la simulación.
	 *
	 * @param {Function} callback - Función llamada con cada nueva posición
	 * @returns {void}
	 */
	start(callback) {
		if (this.#intervalId) {
			this.stop();
		}

		// Emitir posición inicial
		callback(this.#createPositionObject());

		this.#intervalId = setInterval(() => {
			this.#updatePosition();
			callback(this.#createPositionObject());
		}, this.#config.interval);

		console.log("🎮 GeoSimulator started");
	}

	/**
	 * Detiene la simulación.
	 *
	 * @returns {void}
	 */
	stop() {
		if (this.#intervalId) {
			clearInterval(this.#intervalId);
			this.#intervalId = null;
			console.log("🎮 GeoSimulator stopped");
		}
	}

	/**
	 * Verifica si el simulador está activo.
	 *
	 * @returns {boolean} True si está simulando
	 */
	isRunning() {
		return this.#intervalId !== null;
	}

	/**
	 * Actualiza la posición simulada.
	 *
	 * @private
	 */
	#updatePosition() {
		// Variar dirección aleatoriamente (simula giros naturales)
		this.#direction +=
			(Math.random() - 0.5) * 2 * this.#config.directionVariance;

		// Calcular desplazamiento
		const distanceMeters = this.#config.speed * (this.#config.interval / 1000);

		// Convertir a grados (aproximación: 1 grado ≈ 111,320 metros)
		const latChange = (distanceMeters * Math.cos(this.#direction)) / 111320;
		const lngChange =
			(distanceMeters * Math.sin(this.#direction)) /
			(111320 * Math.cos((this.#currentPosition.lat * Math.PI) / 180));

		// Actualizar posición
		this.#currentPosition = {
			lat: this.#currentPosition.lat + latChange,
			lng: this.#currentPosition.lng + lngChange,
		};
	}

	/**
	 * Crea objeto de posición compatible con GeoLocationService.
	 *
	 * @private
	 * @returns {Object} Objeto posición
	 */
	#createPositionObject() {
		return {
			lat: this.#currentPosition.lat,
			lng: this.#currentPosition.lng,
			accuracy: this.#config.accuracy + Math.random() * 5,
			timestamp: Date.now(),
		};
	}

	/**
	 * Configura velocidad de simulación.
	 *
	 * @param {number} metersPerSecond - Velocidad en m/s
	 */
	setSpeed(metersPerSecond) {
		this.#config.speed = metersPerSecond;
	}

	/**
	 * Obtiene la posición actual.
	 *
	 * @returns {Object} Posición actual
	 */
	getCurrentPosition() {
		return { ...this.#currentPosition };
	}
}

export default GeoSimulator;
