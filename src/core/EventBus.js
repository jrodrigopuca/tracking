/**
 * @fileoverview EventBus - Sistema de eventos pub/sub para comunicación entre módulos
 * @module core/EventBus
 * @description Implementa el patrón Observer para desacoplar módulos.
 * Permite que los módulos se comuniquen sin conocerse directamente.
 *
 * @example
 * import { EventBus } from './core/EventBus.js';
 *
 * // Suscribirse a un evento
 * EventBus.on('route:saved', (route) => console.log('Guardado:', route));
 *
 * // Emitir un evento
 * EventBus.emit('route:saved', { name: 'Mi ruta', distance: 5.2 });
 *
 * // Desuscribirse
 * EventBus.off('route:saved', myCallback);
 */

/**
 * @typedef {Object} EventBus
 * @property {Object.<string, Function[]>} events - Mapa de eventos y sus callbacks
 */

/**
 * Bus de eventos central para la aplicación.
 * Implementa patrón Singleton mediante module pattern.
 *
 * Eventos del sistema:
 * - `tracking:started` - Tracking iniciado
 * - `tracking:stopped` - Tracking detenido
 * - `location:updated` - Nueva posición GPS
 * - `location:error` - Error de GPS
 * - `route:point-added` - Punto agregado a ruta
 * - `route:saved` - Ruta guardada
 * - `route:deleted` - Ruta eliminada
 * - `route:imported` - Ruta importada
 * - `map:ready` - Mapa inicializado
 * - `ui:notification` - Mostrar notificación
 *
 * @namespace EventBus
 */
export const EventBus = {
	/** @type {Object.<string, Function[]>} Mapa de eventos */
	events: {},

	/**
	 * Suscribe un callback a un evento.
	 *
	 * @param {string} event - Nombre del evento
	 * @param {Function} callback - Función a ejecutar cuando se emita el evento
	 * @returns {Function} Función para desuscribirse
	 *
	 * @example
	 * const unsubscribe = EventBus.on('route:saved', (route) => {
	 *   console.log('Ruta guardada:', route.name);
	 * });
	 * // Más tarde...
	 * unsubscribe();
	 */
	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);

		// Retorna función para desuscribirse
		return () => this.off(event, callback);
	},

	/**
	 * Desuscribe un callback de un evento.
	 *
	 * @param {string} event - Nombre del evento
	 * @param {Function} callback - Función a remover
	 * @returns {void}
	 */
	off(event, callback) {
		if (!this.events[event]) return;
		this.events[event] = this.events[event].filter((cb) => cb !== callback);
	},

	/**
	 * Emite un evento notificando a todos los suscriptores.
	 *
	 * @param {string} event - Nombre del evento
	 * @param {*} [data] - Datos a pasar a los callbacks
	 * @returns {void}
	 *
	 * @example
	 * EventBus.emit('route:saved', {
	 *   id: '123',
	 *   name: 'Mi ruta',
	 *   distance: 5.2
	 * });
	 */
	emit(event, data) {
		if (!this.events[event]) return;

		this.events[event].forEach((callback) => {
			try {
				callback(data);
			} catch (error) {
				console.error(`Error in EventBus callback for "${event}":`, error);
			}
		});
	},

	/**
	 * Suscribe un callback que se ejecuta solo una vez.
	 *
	 * @param {string} event - Nombre del evento
	 * @param {Function} callback - Función a ejecutar
	 * @returns {Function} Función para desuscribirse
	 *
	 * @example
	 * EventBus.once('map:ready', (data) => {
	 *   console.log('El mapa está listo');
	 * });
	 */
	once(event, callback) {
		const wrapper = (data) => {
			callback(data);
			this.off(event, wrapper);
		};
		return this.on(event, wrapper);
	},

	/**
	 * Verifica si hay suscriptores para un evento.
	 *
	 * @param {string} event - Nombre del evento
	 * @returns {boolean} True si hay suscriptores
	 */
	has(event) {
		return !!(this.events[event] && this.events[event].length > 0);
	},

	/**
	 * Obtiene el número de suscriptores de un evento.
	 *
	 * @param {string} event - Nombre del evento
	 * @returns {number} Cantidad de suscriptores
	 */
	listenerCount(event) {
		return this.events[event] ? this.events[event].length : 0;
	},

	/**
	 * Limpia todos los listeners de un evento o todos los eventos.
	 *
	 * @param {string} [event] - Nombre del evento (opcional)
	 * @returns {void}
	 *
	 * @example
	 * // Limpiar un evento específico
	 * EventBus.clear('route:saved');
	 *
	 * // Limpiar todos los eventos
	 * EventBus.clear();
	 */
	clear(event) {
		if (event) {
			delete this.events[event];
		} else {
			this.events = {};
		}
	},

	/**
	 * Lista todos los eventos registrados.
	 *
	 * @returns {string[]} Array de nombres de eventos
	 */
	getEvents() {
		return Object.keys(this.events);
	},
};

export default EventBus;
