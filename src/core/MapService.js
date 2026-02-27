/**
 * @fileoverview MapService - Abstracción del mapa Leaflet
 * @module core/MapService
 * @description Wrapper de Leaflet que provee una interfaz simple para operaciones de mapa.
 * Implementa Single Responsibility y permite intercambiar proveedores de mapas.
 *
 * @example
 * import { MapService } from './core/MapService.js';
 *
 * const map = new MapService('map-container');
 * map.addMarker({ lat: -12.0464, lng: -77.0428 });
 * map.updatePolyline(points);
 */

import { EventBus } from "./EventBus.js";

/**
 * @typedef {Object} Position
 * @property {number} lat - Latitud
 * @property {number} lng - Longitud
 */

/**
 * @typedef {Object} MapOptions
 * @property {number} [lat=-12.0464] - Latitud inicial
 * @property {number} [lng=-77.0428] - Longitud inicial
 * @property {number} [zoom=18] - Nivel de zoom inicial
 */

/**
 * Servicio de mapa usando Leaflet + OpenStreetMap.
 * Implementa Single Responsibility: solo operaciones de mapa.
 *
 * @class MapService
 */
export class MapService {
	/** @type {L.Map} Instancia del mapa Leaflet */
	#map = null;

	/** @type {L.Polyline} Línea del recorrido */
	#polyline = null;

	/** @type {L.Marker[]} Markers en el mapa */
	#markers = [];

	/** @type {string} ID del contenedor */
	#containerId;

	/**
	 * Crea una nueva instancia de MapService.
	 *
	 * @param {string} containerId - ID del elemento contenedor del mapa
	 * @param {MapOptions} [options={}] - Opciones de configuración
	 */
	constructor(containerId, options = {}) {
		this.#containerId = containerId;
		const { lat = -12.0464, lng = -77.0428, zoom = 18 } = options;

		this.#map = L.map(containerId).setView([lat, lng], zoom);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: "© OpenStreetMap contributors",
		}).addTo(this.#map);

		EventBus.emit("map:ready", { map: this.#map });
	}

	/**
	 * Agrega un marker al mapa.
	 *
	 * @param {Position} position - Posición del marker
	 * @param {Object} [options={}] - Opciones del marker
	 * @returns {L.Marker} El marker creado
	 */
	addMarker(position, options = {}) {
		const marker = L.marker([position.lat, position.lng], options).addTo(
			this.#map,
		);
		this.#markers.push(marker);
		return marker;
	}

	/**
	 * Agrega un marker con popup.
	 *
	 * @param {Position} position - Posición del marker
	 * @param {string} content - Contenido HTML del popup
	 * @returns {L.Marker} El marker creado
	 */
	addMarkerWithPopup(position, content) {
		const marker = this.addMarker(position);
		marker.bindPopup(content);
		return marker;
	}

	/**
	 * Actualiza la polyline con nuevas posiciones.
	 *
	 * @param {Position[]} positions - Array de posiciones
	 * @param {Object} [style={}] - Opciones de estilo
	 * @returns {L.Polyline} La polyline actualizada
	 */
	updatePolyline(positions, style = {}) {
		if (this.#polyline) {
			this.#map.removeLayer(this.#polyline);
		}

		const defaultStyle = {
			color: "#3388ff",
			weight: 4,
			opacity: 0.8,
		};

		const latLngs = positions.map((p) => [p.lat, p.lng]);
		this.#polyline = L.polyline(latLngs, { ...defaultStyle, ...style }).addTo(
			this.#map,
		);

		return this.#polyline;
	}

	/**
	 * Centra el mapa en una posición.
	 *
	 * @param {Position} position - Posición para centrar
	 * @param {number} [zoom] - Nivel de zoom opcional
	 * @returns {void}
	 */
	centerOn(position, zoom) {
		if (zoom !== undefined) {
			this.#map.setView([position.lat, position.lng], zoom);
		} else {
			this.#map.setView([position.lat, position.lng]);
		}
	}

	/**
	 * Obtiene el centro actual del mapa.
	 *
	 * @returns {Position} Posición del centro
	 */
	getCenter() {
		const center = this.#map.getCenter();
		return { lat: center.lat, lng: center.lng };
	}

	/**
	 * Ajusta el mapa para mostrar todas las posiciones.
	 *
	 * @param {Position[]} positions - Array de posiciones
	 * @param {Object} [options={}] - Opciones de fitBounds
	 * @returns {void}
	 */
	fitToPositions(positions, options = {}) {
		if (positions.length === 0) return;

		const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
		this.#map.fitBounds(bounds, { padding: [50, 50], ...options });
	}

	/**
	 * Incrementa el nivel de zoom.
	 *
	 * @returns {void}
	 */
	zoomIn() {
		this.#map.setZoom(this.#map.getZoom() + 1);
	}

	/**
	 * Decrementa el nivel de zoom.
	 *
	 * @returns {void}
	 */
	zoomOut() {
		this.#map.setZoom(this.#map.getZoom() - 1);
	}

	/**
	 * Obtiene el nivel de zoom actual.
	 *
	 * @returns {number} Nivel de zoom
	 */
	getZoom() {
		return this.#map.getZoom();
	}

	/**
	 * Limpia todos los markers del mapa.
	 *
	 * @returns {void}
	 */
	clearMarkers() {
		this.#markers.forEach((m) => this.#map.removeLayer(m));
		this.#markers = [];
	}

	/**
	 * Limpia la polyline del mapa.
	 *
	 * @returns {void}
	 */
	clearPolyline() {
		if (this.#polyline) {
			this.#map.removeLayer(this.#polyline);
			this.#polyline = null;
		}
	}

	/**
	 * Limpia todo el contenido del mapa.
	 *
	 * @returns {void}
	 */
	clear() {
		this.clearMarkers();
		this.clearPolyline();
	}

	/**
	 * Invalida el tamaño del mapa (usar después de resize).
	 *
	 * @returns {void}
	 */
	invalidateSize() {
		this.#map.invalidateSize();
	}

	/**
	 * Obtiene la instancia nativa de Leaflet.
	 *
	 * @returns {L.Map} Instancia del mapa
	 */
	getNativeMap() {
		return this.#map;
	}

	/**
	 * Destruye el mapa y limpia recursos.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.clear();
		this.#map.remove();
		this.#map = null;
	}
}

export default MapService;
