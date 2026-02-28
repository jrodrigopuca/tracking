/**
 * @fileoverview Simulador de GPS para testing y desarrollo.
 * Genera rutas realistas sin necesidad de GPS real.
 *
 * @module core/GeoSimulator
 */

/**
 * Modos de velocidad para simulación realista.
 * @type {Object}
 */
const PACE_MODES = {
	walking: {
		name: "Caminando",
		minSpeed: 1.2, // m/s (~4.3 km/h)
		maxSpeed: 1.5, // m/s (~5.4 km/h)
		minDuration: 15, // segundos mínimo en este modo
		maxDuration: 45, // segundos máximo
		emoji: "🚶",
	},
	jogging: {
		name: "Trotando",
		minSpeed: 2.2, // m/s (~8 km/h)
		maxSpeed: 3.0, // m/s (~11 km/h)
		minDuration: 10,
		maxDuration: 30,
		emoji: "🏃",
	},
	running: {
		name: "Corriendo",
		minSpeed: 3.5, // m/s (~12.5 km/h)
		maxSpeed: 5.0, // m/s (~18 km/h)
		minDuration: 5,
		maxDuration: 20,
		emoji: "💨",
	},
	resting: {
		name: "Descansando",
		minSpeed: 0,
		maxSpeed: 0.3, // pequeño movimiento mientras descansa
		minDuration: 5,
		maxDuration: 15,
		emoji: "⏸️",
	},
};

/**
 * Transiciones naturales entre modos (no salta de caminar a correr directamente).
 * @type {Object}
 */
const PACE_TRANSITIONS = {
	walking: ["walking", "walking", "jogging", "resting"], // 50% seguir, 25% trotar, 25% descansar
	jogging: ["jogging", "walking", "running", "jogging"], // 50% seguir, 25% caminar, 25% correr
	running: ["running", "jogging", "jogging", "running"], // 50% seguir, 50% bajar a trotar
	resting: ["walking", "walking", "resting", "jogging"], // 50% caminar, 25% seguir, 25% trotar
};

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

	/** @type {string} Modo de velocidad actual */
	#currentPace = "walking";

	/** @type {number} Velocidad actual en m/s */
	#currentSpeed = 1.4;

	/** @type {number} Tiempo restante en el modo actual (en ticks) */
	#paceTimeRemaining = 0;

	/** @type {Object} Configuración */
	#config = {
		/** Intervalo entre puntos en ms */
		interval: 1000,
		/** Variación aleatoria de dirección (radianes) */
		directionVariance: 0.3,
		/** Precisión simulada en metros */
		accuracy: 10,
		/** Habilitar cambio dinámico de velocidad */
		dynamicPace: true,
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

		// Inicializar modo de velocidad solo si es dinámico
		if (this.#config.dynamicPace) {
			this.#selectNewPace();
		}

		// Emitir posición inicial
		callback(this.#createPositionObject());

		this.#intervalId = setInterval(() => {
			this.#updatePosition();
			callback(this.#createPositionObject());
		}, this.#config.interval);

		const paceInfo = PACE_MODES[this.#currentPace];
		console.log(
			`🎮 GeoSimulator started in ${this.#selectedCity.name} ${paceInfo?.emoji || "🚶"}`,
		);
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
		// Actualizar modo de velocidad si es dinámico
		if (this.#config.dynamicPace) {
			this.#paceTimeRemaining--;
			if (this.#paceTimeRemaining <= 0) {
				this.#selectNewPace();
			}
		}

		// Variar dirección aleatoriamente (simula giros naturales)
		// Más variación cuando se va más lento
		const directionVariance =
			this.#config.directionVariance * (1 + (2 - this.#currentSpeed) * 0.3);
		this.#direction += (Math.random() - 0.5) * 2 * directionVariance;

		// Calcular desplazamiento con velocidad actual
		const distanceMeters = this.#currentSpeed * (this.#config.interval / 1000);

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
	 * Selecciona un nuevo modo de velocidad.
	 *
	 * @private
	 */
	#selectNewPace() {
		// Elegir siguiente modo basado en transiciones naturales
		const transitions = PACE_TRANSITIONS[this.#currentPace];
		const nextPace =
			transitions[Math.floor(Math.random() * transitions.length)];
		const mode = PACE_MODES[nextPace];

		// Calcular velocidad aleatoria dentro del rango del modo
		this.#currentSpeed =
			mode.minSpeed + Math.random() * (mode.maxSpeed - mode.minSpeed);

		// Calcular duración en ticks (segundos / intervalo)
		const durationSeconds =
			mode.minDuration + Math.random() * (mode.maxDuration - mode.minDuration);
		this.#paceTimeRemaining = Math.round(
			durationSeconds / (this.#config.interval / 1000),
		);

		// Log solo si cambió de modo
		if (nextPace !== this.#currentPace) {
			console.log(
				`${mode.emoji} Cambio a: ${mode.name} (${(this.#currentSpeed * 3.6).toFixed(1)} km/h)`,
			);
		}

		this.#currentPace = nextPace;
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
	 * Configura velocidad de simulación (desactiva modo dinámico).
	 *
	 * @param {number} metersPerSecond - Velocidad en m/s
	 */
	setSpeed(metersPerSecond) {
		this.#currentSpeed = metersPerSecond;
		this.#config.dynamicPace = false;
	}

	/**
	 * Habilita/deshabilita el cambio dinámico de velocidad.
	 *
	 * @param {boolean} enabled - True para habilitar
	 */
	setDynamicPace(enabled) {
		this.#config.dynamicPace = enabled;
		if (enabled) {
			this.#selectNewPace();
		}
	}

	/**
	 * Obtiene información del modo actual.
	 *
	 * @returns {Object} Modo actual con nombre, velocidad, etc.
	 */
	getCurrentPaceInfo() {
		const mode = PACE_MODES[this.#currentPace];
		return {
			mode: this.#currentPace,
			name: mode.name,
			emoji: mode.emoji,
			speed: this.#currentSpeed,
			speedKmh: this.#currentSpeed * 3.6,
		};
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
