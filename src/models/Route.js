/**
 * @fileoverview Route - Modelo de datos para recorridos GPS
 * @module models/Route
 * @description Representa un recorrido con puntos GPS, metadatos y cálculo de distancia.
 *
 * @example
 * import { Route } from './models/Route.js';
 *
 * const route = new Route('Mi paseo');
 * route.addPoint(-12.0464, -77.0428);
 * console.log(route.getDistance());
 */

import { DistanceCalculator } from "../core/DistanceCalculator.js";

/**
 * @typedef {Object} Position
 * @property {number} lat - Latitud en grados decimales
 * @property {number} lng - Longitud en grados decimales
 * @property {number} [timestamp] - Unix timestamp
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
 * Representa un recorrido GPS con puntos, distancia y metadatos.
 * Implementa el principio Single Responsibility: solo gestión de datos de ruta.
 *
 * @class Route
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
	 * Obtiene el último punto del recorrido.
	 *
	 * @returns {Position|null} Último punto o null si está vacío
	 */
	getLastPoint() {
		return this.points.length > 0 ? this.points[this.points.length - 1] : null;
	}

	/**
	 * Obtiene el número de puntos en el recorrido.
	 *
	 * @returns {number} Cantidad de puntos
	 */
	getPointCount() {
		return this.points.length;
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
	 * Calcula el tiempo transcurrido desde el primer punto.
	 *
	 * @returns {number} Tiempo en milisegundos (0 si no hay puntos)
	 */
	getElapsedTime() {
		if (this.points.length < 1) return 0;

		const firstPoint = this.points[0];
		const lastPoint = this.points[this.points.length - 1];

		return (lastPoint.timestamp || Date.now()) - (firstPoint.timestamp || 0);
	}

	/**
	 * Calcula el tiempo transcurrido formateado.
	 *
	 * @returns {string} Tiempo en formato HH:MM:SS
	 */
	getFormattedElapsedTime() {
		const ms = this.getElapsedTime();
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return [
			hours.toString().padStart(2, "0"),
			minutes.toString().padStart(2, "0"),
			seconds.toString().padStart(2, "0"),
		].join(":");
	}

	/**
	 * Calcula la velocidad actual basada en los últimos 2 puntos.
	 *
	 * @returns {number} Velocidad en km/h (0 si no hay suficientes puntos)
	 */
	getCurrentSpeed() {
		if (this.points.length < 2) return 0;

		const lastPoint = this.points[this.points.length - 1];
		const prevPoint = this.points[this.points.length - 2];

		// Distancia entre los últimos 2 puntos (en km)
		const distance = DistanceCalculator.haversine(
			prevPoint.lat,
			prevPoint.lng,
			lastPoint.lat,
			lastPoint.lng,
		);

		// Tiempo entre los últimos 2 puntos (en horas)
		const timeDiff = (lastPoint.timestamp - prevPoint.timestamp) / 1000 / 3600;

		if (timeDiff <= 0) return 0;

		return distance / timeDiff;
	}

	/**
	 * Calcula la velocidad promedio del recorrido.
	 *
	 * @returns {number} Velocidad promedio en km/h
	 */
	getAverageSpeed() {
		const distance = this.getDistance();
		const timeHours = this.getElapsedTime() / 1000 / 3600;

		if (timeHours <= 0) return 0;

		return distance / timeHours;
	}

	/**
	 * Limpia todos los puntos del recorrido.
	 *
	 * @returns {void}
	 */
	clear() {
		this.points = [];
	}

	/**
	 * Serializa el recorrido a objeto plano para JSON.
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
			duration: this.getElapsedTime(),
			averageSpeed: this.getAverageSpeed(),
		};
	}

	/**
	 * Crea una instancia desde datos JSON.
	 *
	 * @static
	 * @param {RouteData} data - Datos del recorrido
	 * @returns {Route} Nueva instancia
	 * @throws {Error} Si los datos son inválidos
	 */
	static fromJSON(data) {
		if (!data || typeof data !== "object") {
			throw new Error("Datos de ruta inválidos");
		}

		const route = new Route(data.name || "Sin nombre", data.id);
		route.points = Array.isArray(data.points) ? data.points : [];
		route.createdAt = data.createdAt || new Date().toISOString();
		return route;
	}

	/**
	 * Valida que un objeto tenga la estructura de RouteData.
	 *
	 * @static
	 * @param {*} data - Datos a validar
	 * @returns {boolean} True si es válido
	 */
	static isValid(data) {
		if (!data || typeof data !== "object") return false;
		if (!Array.isArray(data.points)) return false;

		return data.points.every(
			(p) => typeof p.lat === "number" && typeof p.lng === "number",
		);
	}
}

export default Route;
