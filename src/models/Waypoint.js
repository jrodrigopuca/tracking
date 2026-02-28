/**
 * @fileoverview Waypoint - Punto de interés marcado manualmente
 * @module models/Waypoint
 * @description Representa un punto de interés que el usuario marca durante el tracking.
 * Simple y minimalista: solo posición y texto corto.
 *
 * @example
 * import { Waypoint } from './models/Waypoint.js';
 *
 * const waypoint = new Waypoint(-12.0464, -77.0428, 'Mirador increíble');
 */

/**
 * Genera un ID único para el waypoint.
 * @returns {string} UUID v4
 */
function generateId() {
	return (
		crypto.randomUUID?.() ||
		"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		})
	);
}

/**
 * @typedef {Object} WaypointData
 * @property {string} id - Identificador único
 * @property {number} lat - Latitud
 * @property {number} lng - Longitud
 * @property {string} name - Texto corto descriptivo (máx 50 caracteres)
 * @property {number} timestamp - Unix timestamp de creación
 */

/**
 * Clase que representa un punto de interés.
 * Diseñado para ser simple y rápido de crear durante el tracking.
 *
 * @class Waypoint
 */
export class Waypoint {
	/** @type {string} */
	id;

	/** @type {number} */
	lat;

	/** @type {number} */
	lng;

	/** @type {string} */
	name;

	/** @type {number} */
	timestamp;

	/** @type {number} Longitud máxima del nombre */
	static MAX_NAME_LENGTH = 50;

	/**
	 * Crea un nuevo waypoint.
	 *
	 * @param {number} lat - Latitud en grados decimales
	 * @param {number} lng - Longitud en grados decimales
	 * @param {string} name - Texto descriptivo corto
	 */
	constructor(lat, lng, name) {
		this.id = generateId();
		this.lat = lat;
		this.lng = lng;
		this.name = (name || "").slice(0, Waypoint.MAX_NAME_LENGTH).trim();
		this.timestamp = Date.now();
	}

	/**
	 * Serializa el waypoint a objeto plano.
	 *
	 * @returns {WaypointData}
	 */
	toJSON() {
		return {
			id: this.id,
			lat: this.lat,
			lng: this.lng,
			name: this.name,
			timestamp: this.timestamp,
		};
	}

	/**
	 * Crea un waypoint desde datos serializados.
	 *
	 * @param {WaypointData} data - Datos del waypoint
	 * @returns {Waypoint}
	 */
	static fromJSON(data) {
		const waypoint = new Waypoint(data.lat, data.lng, data.name);
		waypoint.id = data.id;
		waypoint.timestamp = data.timestamp;
		return waypoint;
	}
}
