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

/**
 * @typedef {Object} Position
 * @property {number} lat - Latitud en grados decimales
 * @property {number} lng - Longitud en grados decimales
 * @property {number} [accuracy] - Precisión en metros (opcional)
 * @property {number} [timestamp] - Unix timestamp (opcional)
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
