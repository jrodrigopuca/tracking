/**
 * @fileoverview Notifications - Sistema de notificaciones toast
 * @module ui/Notifications
 * @description Muestra notificaciones no intrusivas al usuario.
 * Reemplaza los alerts por toasts con animación.
 *
 * @example
 * import { Notifications } from './ui/Notifications.js';
 *
 * Notifications.success('Recorrido guardado');
 * Notifications.error('Error al obtener ubicación');
 * Notifications.info('Tracking iniciado');
 */

/**
 * @typedef {'success'|'error'|'info'|'warning'} NotificationType
 */

/**
 * @typedef {Object} NotificationOptions
 * @property {number} [duration=3000] - Duración en ms
 * @property {boolean} [dismissible=true] - Puede cerrarse manualmente
 */

/**
 * Sistema de notificaciones toast.
 * Implementa Single Responsibility: solo notificaciones UI.
 *
 * @namespace Notifications
 */
export const Notifications = {
	/** @type {HTMLElement|null} Contenedor de notificaciones */
	container: null,

	/**
	 * Inicializa el contenedor de notificaciones.
	 * Se llama automáticamente en la primera notificación.
	 *
	 * @returns {HTMLElement} El contenedor
	 */
	init() {
		if (this.container) return this.container;

		this.container = document.createElement("div");
		this.container.id = "notifications-container";
		this.container.className = "notifications-container";
		this.container.setAttribute("role", "alert");
		this.container.setAttribute("aria-live", "polite");
		document.body.appendChild(this.container);

		return this.container;
	},

	/**
	 * Muestra una notificación.
	 *
	 * @param {string} message - Mensaje a mostrar
	 * @param {NotificationType} [type='info'] - Tipo de notificación
	 * @param {NotificationOptions} [options={}] - Opciones adicionales
	 * @returns {HTMLElement} El elemento de la notificación
	 */
	show(message, type = "info", options = {}) {
		this.init();

		const { duration = 3000, dismissible = true } = options;

		const notification = document.createElement("div");
		notification.className = `notification notification--${type}`;

		const icon = this._getIcon(type);
		notification.innerHTML = `
      <span class="notification__icon">${icon}</span>
      <span class="notification__message">${message}</span>
      ${dismissible ? '<button class="notification__close" aria-label="Cerrar">&times;</button>' : ""}
    `;

		if (dismissible) {
			notification
				.querySelector(".notification__close")
				.addEventListener("click", () => {
					this._remove(notification);
				});
		}

		this.container.appendChild(notification);

		// Trigger animation
		requestAnimationFrame(() => {
			notification.classList.add("notification--visible");
		});

		// Auto remove
		if (duration > 0) {
			setTimeout(() => this._remove(notification), duration);
		}

		return notification;
	},

	/**
	 * Muestra una notificación de éxito.
	 *
	 * @param {string} message - Mensaje
	 * @param {NotificationOptions} [options] - Opciones
	 * @returns {HTMLElement} Notificación
	 */
	success(message, options) {
		return this.show(message, "success", options);
	},

	/**
	 * Muestra una notificación de error.
	 *
	 * @param {string} message - Mensaje
	 * @param {NotificationOptions} [options] - Opciones
	 * @returns {HTMLElement} Notificación
	 */
	error(message, options) {
		return this.show(message, "error", { duration: 5000, ...options });
	},

	/**
	 * Muestra una notificación informativa.
	 *
	 * @param {string} message - Mensaje
	 * @param {NotificationOptions} [options] - Opciones
	 * @returns {HTMLElement} Notificación
	 */
	info(message, options) {
		return this.show(message, "info", options);
	},

	/**
	 * Muestra una notificación de advertencia.
	 *
	 * @param {string} message - Mensaje
	 * @param {NotificationOptions} [options] - Opciones
	 * @returns {HTMLElement} Notificación
	 */
	warning(message, options) {
		return this.show(message, "warning", options);
	},

	/**
	 * Remueve una notificación con animación.
	 *
	 * @private
	 * @param {HTMLElement} notification - Elemento a remover
	 * @returns {void}
	 */
	_remove(notification) {
		notification.classList.remove("notification--visible");
		notification.classList.add("notification--hiding");

		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	},

	/**
	 * Obtiene el ícono para el tipo de notificación.
	 *
	 * @private
	 * @param {NotificationType} type - Tipo de notificación
	 * @returns {string} HTML del ícono
	 */
	_getIcon(type) {
		const icons = {
			success: "✓",
			error: "✕",
			warning: "⚠",
			info: "ℹ",
		};
		return icons[type] || icons.info;
	},

	/**
	 * Limpia todas las notificaciones.
	 *
	 * @returns {void}
	 */
	clearAll() {
		if (this.container) {
			this.container.innerHTML = "";
		}
	},
};

export default Notifications;
