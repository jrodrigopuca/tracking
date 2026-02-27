/**
 * @fileoverview StorageService - Servicio de persistencia de datos
 * @module core/StorageService
 * @description Abstracción de localStorage para guardar, obtener y exportar recorridos.
 * Emite eventos via EventBus cuando se modifican los datos.
 *
 * @example
 * import { StorageService } from './core/StorageService.js';
 *
 * const storage = new StorageService('tracking_routes');
 * storage.save(route.toJSON());
 * const routes = storage.getAll();
 */

import { EventBus } from "./EventBus.js";

/**
 * @typedef {Object} RouteData
 * @property {string} id - Identificador único
 * @property {string} name - Nombre del recorrido
 * @property {Array} points - Array de posiciones
 * @property {string} createdAt - ISO timestamp
 * @property {number} distance - Distancia en km
 */

/**
 * Servicio de persistencia de datos en localStorage.
 * Implementa Single Responsibility: solo almacenamiento.
 *
 * @class StorageService
 */
export class StorageService {
	/** @type {string} Clave de localStorage */
	#storageKey;

	/**
	 * Crea una nueva instancia de StorageService.
	 *
	 * @param {string} [storageKey='tracking_routes'] - Clave para localStorage
	 */
	constructor(storageKey = "tracking_routes") {
		this.#storageKey = storageKey;
	}

	/**
	 * Obtiene todos los recorridos guardados.
	 *
	 * @returns {RouteData[]} Array de recorridos
	 */
	getAll() {
		try {
			const data = localStorage.getItem(this.#storageKey);
			return data ? JSON.parse(data) : [];
		} catch (error) {
			console.error("Error reading from storage:", error);
			return [];
		}
	}

	/**
	 * Guarda un recorrido nuevo.
	 *
	 * @param {RouteData} route - Datos del recorrido
	 * @returns {boolean} True si se guardó correctamente
	 */
	save(route) {
		try {
			const routes = this.getAll();
			routes.push(route);
			localStorage.setItem(this.#storageKey, JSON.stringify(routes));
			EventBus.emit("route:saved", route);
			return true;
		} catch (error) {
			console.error("Error saving to storage:", error);
			return false;
		}
	}

	/**
	 * Obtiene un recorrido por su ID.
	 *
	 * @param {string} id - ID del recorrido
	 * @returns {RouteData|null} Recorrido o null si no existe
	 */
	getById(id) {
		const routes = this.getAll();
		return (
			routes.find((r) => r.id === id || r.id.toString() === id.toString()) ||
			null
		);
	}

	/**
	 * Actualiza un recorrido existente.
	 *
	 * @param {string} id - ID del recorrido
	 * @param {Partial<RouteData>} updates - Campos a actualizar
	 * @returns {boolean} True si se actualizó correctamente
	 */
	update(id, updates) {
		try {
			const routes = this.getAll();
			const index = routes.findIndex((r) => r.id === id);

			if (index === -1) return false;

			routes[index] = { ...routes[index], ...updates };
			localStorage.setItem(this.#storageKey, JSON.stringify(routes));
			EventBus.emit("route:updated", routes[index]);
			return true;
		} catch (error) {
			console.error("Error updating storage:", error);
			return false;
		}
	}

	/**
	 * Elimina un recorrido por su ID.
	 *
	 * @param {string} id - ID del recorrido
	 * @returns {boolean} True si se eliminó correctamente
	 */
	delete(id) {
		try {
			const routes = this.getAll();
			const filtered = routes.filter(
				(r) => r.id !== id && r.id.toString() !== id.toString(),
			);

			if (filtered.length === routes.length) return false;

			localStorage.setItem(this.#storageKey, JSON.stringify(filtered));
			EventBus.emit("route:deleted", { id });
			return true;
		} catch (error) {
			console.error("Error deleting from storage:", error);
			return false;
		}
	}

	/**
	 * Elimina todos los recorridos.
	 *
	 * @returns {boolean} True si se limpiaron correctamente
	 */
	clear() {
		try {
			localStorage.removeItem(this.#storageKey);
			EventBus.emit("routes:cleared", {});
			return true;
		} catch (error) {
			console.error("Error clearing storage:", error);
			return false;
		}
	}

	/**
	 * Exporta un recorrido a archivo JSON.
	 *
	 * @param {RouteData} route - Recorrido a exportar
	 * @returns {void}
	 */
	exportToJson(route) {
		const data = {
			name: route.name,
			createdAt: route.createdAt,
			distance: route.distance,
			points: route.points,
		};

		const jsonString = JSON.stringify(data, null, 2);
		const blob = new Blob([jsonString], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = `recorrido-${route.name || route.id}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		URL.revokeObjectURL(url);
	}

	/**
	 * Importa puntos desde un archivo JSON.
	 *
	 * @param {File} file - Archivo JSON a importar
	 * @returns {Promise<Array>} Array de puntos importados
	 * @throws {Error} Si el archivo es inválido
	 */
	importFromJson(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const data = JSON.parse(e.target.result);
					let points;

					// Soportar ambos formatos: array directo o objeto con points
					if (Array.isArray(data)) {
						points = data;
					} else if (data.points && Array.isArray(data.points)) {
						points = data.points;
					} else {
						reject(
							new Error(
								'Formato inválido: debe ser un array de puntos o un objeto con propiedad "points"',
							),
						);
						return;
					}

					// Validar estructura de puntos
					const isValid = points.every(
						(p) => typeof p.lat === "number" && typeof p.lng === "number",
					);

					if (!isValid) {
						reject(
							new Error(
								"Formato inválido: cada punto debe tener lat y lng numéricos",
							),
						);
						return;
					}

					EventBus.emit("route:imported", { points, source: file.name });
					resolve(points);
				} catch (error) {
					reject(new Error("JSON inválido: " + error.message));
				}
			};

			reader.onerror = () => reject(new Error("Error al leer el archivo"));
			reader.readAsText(file);
		});
	}

	/**
	 * Obtiene el número de recorridos guardados.
	 *
	 * @returns {number} Cantidad de recorridos
	 */
	count() {
		return this.getAll().length;
	}

	/**
	 * Verifica si hay recorridos guardados.
	 *
	 * @returns {boolean} True si hay recorridos
	 */
	hasRoutes() {
		return this.count() > 0;
	}
}

export default StorageService;
