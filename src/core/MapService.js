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
 * @property {number} [zoom=19] - Nivel de zoom inicial
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

	/** @type {L.Polyline[]} Capas de segmentos (para trazos segmentados) */
	#segmentLayers = [];

	/** @type {string} ID del contenedor */
	#containerId;

	/** @type {Object} Iconos personalizados por tipo */
	#icons = {};

	/**
	 * Crea una nueva instancia de MapService.
	 *
	 * @param {string} containerId - ID del elemento contenedor del mapa
	 * @param {MapOptions} [options={}] - Opciones de configuración
	 */
	constructor(containerId, options = {}) {
		this.#containerId = containerId;
		const { lat = -12.0464, lng = -77.0428, zoom = 19 } = options;

		this.#map = L.map(containerId).setView([lat, lng], zoom);
		this.#createCustomIcons();

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: "© OpenStreetMap contributors",
		}).addTo(this.#map);

		EventBus.emit("map:ready", { map: this.#map });
	}

	/**
	 * Crea los iconos personalizados para los diferentes tipos de markers.
	 *
	 * @private
	 */
	#createCustomIcons() {
		// Icono de inicio (verde)
		this.#icons.start = L.divIcon({
			className: "custom-marker custom-marker--start",
			html: '<div class="marker-pin"></div><span class="marker-label">🚀</span>',
			iconSize: [30, 42],
			iconAnchor: [15, 42],
			popupAnchor: [0, -42],
		});

		// Icono de fin (rojo)
		this.#icons.end = L.divIcon({
			className: "custom-marker custom-marker--end",
			html: '<div class="marker-pin"></div><span class="marker-label">🏁</span>',
			iconSize: [30, 42],
			iconAnchor: [15, 42],
			popupAnchor: [0, -42],
		});

		// Icono de posición actual (azul con pulso)
		this.#icons.current = L.divIcon({
			className: "custom-marker custom-marker--current",
			html: '<div class="marker-pin"></div><div class="marker-pulse"></div>',
			iconSize: [20, 20],
			iconAnchor: [10, 10],
			popupAnchor: [0, -10],
		});

		// Icono de ubicación del usuario (morado)
		this.#icons.user = L.divIcon({
			className: "custom-marker custom-marker--user",
			html: '<div class="marker-pin"></div><span class="marker-label">📍</span>',
			iconSize: [30, 42],
			iconAnchor: [15, 42],
			popupAnchor: [0, -42],
		});
	}

	/**
	 * Agrega un marker de inicio (verde).
	 *
	 * @param {Position} position - Posición del marker
	 * @param {string} [popupContent="Inicio"] - Contenido del popup
	 * @returns {L.Marker} El marker creado
	 */
	addStartMarker(position, popupContent = "Inicio") {
		const marker = L.marker([position.lat, position.lng], {
			icon: this.#icons.start,
		}).addTo(this.#map);
		marker.bindPopup(
			`<strong style="color: #22c55e;">🚀 ${popupContent}</strong>`,
		);
		this.#markers.push(marker);
		return marker;
	}

	/**
	 * Agrega un marker de fin (rojo).
	 *
	 * @param {Position} position - Posición del marker
	 * @param {string} [popupContent="Fin"] - Contenido del popup
	 * @returns {L.Marker} El marker creado
	 */
	addEndMarker(position, popupContent = "Fin") {
		const marker = L.marker([position.lat, position.lng], {
			icon: this.#icons.end,
		}).addTo(this.#map);
		marker.bindPopup(
			`<strong style="color: #ef4444;">🏁 ${popupContent}</strong>`,
		);
		this.#markers.push(marker);
		return marker;
	}

	/**
	 * Agrega un marker de posición actual (azul con pulso).
	 *
	 * @param {Position} position - Posición del marker
	 * @returns {L.Marker} El marker creado
	 */
	addCurrentMarker(position) {
		const marker = L.marker([position.lat, position.lng], {
			icon: this.#icons.current,
		}).addTo(this.#map);
		marker.bindPopup(
			'<strong style="color: #3b82f6;">Posición actual</strong>',
		);
		this.#markers.push(marker);
		return marker;
	}

	/**
	 * Agrega un marker de ubicación del usuario (morado).
	 *
	 * @param {Position} position - Posición del marker
	 * @param {string} [popupContent="Estás aquí"] - Contenido del popup
	 * @returns {L.Marker} El marker creado
	 */
	addUserMarker(position, popupContent = "Estás aquí") {
		const marker = L.marker([position.lat, position.lng], {
			icon: this.#icons.user,
		}).addTo(this.#map);
		marker.bindPopup(
			`<strong style="color: #8b5cf6;">📍 ${popupContent}</strong>`,
		);
		this.#markers.push(marker);
		return marker;
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
	 * Dibuja la polyline dividida en segmentos sólidos (grabados)
	 * y líneas punteadas (inferidos/saltos).
	 *
	 * @param {Position[]} points - Array de posiciones
	 * @param {number[]} [segmentBreaks=[]] - Índices donde comienza un nuevo segmento
	 * @returns {void}
	 */
	updateSegmentedPolyline(points, segmentBreaks = []) {
		this.clearPolyline();
		this.#clearSegmentLayers();

		if (points.length < 2) return;

		if (segmentBreaks.length === 0) {
			this.updatePolyline(points);
			return;
		}

		const breaks = [...segmentBreaks].sort((a, b) => a - b);
		const solidStyle = { color: "#3388ff", weight: 4, opacity: 0.8 };
		const dashedStyle = {
			color: "#94a3b8",
			weight: 3,
			opacity: 0.5,
			dashArray: "8, 12",
		};

		let start = 0;
		const segments = [];
		for (const brk of breaks) {
			if (brk > start && brk <= points.length) {
				segments.push(points.slice(start, brk));
				start = brk;
			}
		}
		if (start < points.length) {
			segments.push(points.slice(start));
		}

		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			if (seg.length >= 2) {
				const latLngs = seg.map((p) => [p.lat, p.lng]);
				this.#segmentLayers.push(
					L.polyline(latLngs, solidStyle).addTo(this.#map),
				);
			}
			// Conector punteado entre segmentos consecutivos
			if (i < segments.length - 1 && seg.length > 0) {
				const lastPt = seg[seg.length - 1];
				const nextPt = segments[i + 1][0];
				if (lastPt && nextPt) {
					this.#segmentLayers.push(
						L.polyline(
							[
								[lastPt.lat, lastPt.lng],
								[nextPt.lat, nextPt.lng],
							],
							dashedStyle,
						).addTo(this.#map),
					);
				}
			}
		}
	}

	/**
	 * Limpia las capas de segmentos.
	 *
	 * @private
	 * @returns {void}
	 */
	#clearSegmentLayers() {
		this.#segmentLayers.forEach((layer) => this.#map.removeLayer(layer));
		this.#segmentLayers = [];
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
		this.#clearSegmentLayers();
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
