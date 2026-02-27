/**
 * @fileoverview Servicio de exportación de rutas.
 * Soporta GPX, KML, deep links y Web Share API.
 *
 * @author Tracking App
 * @version 1.0.0
 */

/**
 * @typedef {Object} RoutePoint
 * @property {number} lat - Latitud
 * @property {number} lng - Longitud
 * @property {number} [timestamp] - Timestamp en milisegundos
 */

/**
 * @typedef {Object} RouteData
 * @property {string} [id] - ID del recorrido
 * @property {string} [name] - Nombre del recorrido
 * @property {string} [createdAt] - Fecha de creación ISO
 * @property {RoutePoint[]} points - Puntos del recorrido
 */

/**
 * Servicio para exportar rutas a diferentes formatos.
 * Sigue el principio de responsabilidad única (SRP).
 */
export class ExportService {
	/**
	 * Genera contenido GPX desde una ruta.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 * @returns {string} Contenido GPX en formato XML
	 */
	static toGPX(route) {
		const name = route.name || "Recorrido";
		const time = route.createdAt || new Date().toISOString();

		const trackpoints = route.points
			.map((p) => {
				const timeTag = p.timestamp
					? `<time>${new Date(p.timestamp).toISOString()}</time>`
					: "";
				return `      <trkpt lat="${p.lat}" lon="${p.lng}">${timeTag}</trkpt>`;
			})
			.join("\n");

		return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Tracking App"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${this.#escapeXml(name)}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${this.#escapeXml(name)}</name>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>
</gpx>`;
	}

	/**
	 * Genera contenido KML desde una ruta.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 * @returns {string} Contenido KML en formato XML
	 */
	static toKML(route) {
		const name = route.name || "Recorrido";

		// KML usa formato "lng,lat,alt" separado por espacios
		const coordinates = route.points
			.map((p) => `${p.lng},${p.lat},0`)
			.join(" ");

		return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.#escapeXml(name)}</name>
    <Style id="trackStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>${this.#escapeXml(name)}</name>
      <styleUrl>#trackStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
	}

	/**
	 * Genera URL de Google Maps con waypoints.
	 * Nota: Google Maps tiene un límite de ~25 waypoints.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 * @param {number} [maxWaypoints=23] - Máximo de waypoints intermedios
	 * @returns {string} URL de Google Maps
	 */
	static toGoogleMapsURL(route, maxWaypoints = 23) {
		if (!route.points || route.points.length === 0) {
			return "";
		}

		const points = route.points;
		const origin = points[0];
		const destination = points[points.length - 1];

		let url = `https://www.google.com/maps/dir/?api=1`;
		url += `&origin=${origin.lat},${origin.lng}`;
		url += `&destination=${destination.lat},${destination.lng}`;
		url += `&travelmode=driving`;

		// Agregar waypoints intermedios (samplear si hay demasiados)
		if (points.length > 2) {
			const intermediatePoints = points.slice(1, -1);
			const sampledPoints = this.#samplePoints(
				intermediatePoints,
				maxWaypoints,
			);
			const waypoints = sampledPoints.map((p) => `${p.lat},${p.lng}`).join("|");
			url += `&waypoints=${encodeURIComponent(waypoints)}`;
		}

		return url;
	}

	/**
	 * Genera URL de Apple Maps.
	 * Apple Maps solo soporta origen y destino, sin waypoints intermedios.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 * @returns {string} URL de Apple Maps
	 */
	static toAppleMapsURL(route) {
		if (!route.points || route.points.length === 0) {
			return "";
		}

		const points = route.points;
		const origin = points[0];
		const destination = points[points.length - 1];

		return `http://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}&dirflg=d`;
	}

	/**
	 * Descarga un archivo con el contenido dado.
	 *
	 * @param {string} content - Contenido del archivo
	 * @param {string} filename - Nombre del archivo
	 * @param {string} mimeType - Tipo MIME
	 */
	static downloadFile(content, filename, mimeType) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		URL.revokeObjectURL(url);
	}

	/**
	 * Descarga ruta como archivo GPX.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 */
	static downloadGPX(route) {
		const gpx = this.toGPX(route);
		const filename = `recorrido-${route.name || route.id || "track"}.gpx`;
		this.downloadFile(gpx, filename, "application/gpx+xml");
	}

	/**
	 * Descarga ruta como archivo KML.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 */
	static downloadKML(route) {
		const kml = this.toKML(route);
		const filename = `recorrido-${route.name || route.id || "track"}.kml`;
		this.downloadFile(kml, filename, "application/vnd.google-earth.kml+xml");
	}

	/**
	 * Abre Google Maps con la ruta.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 */
	static openInGoogleMaps(route) {
		const url = this.toGoogleMapsURL(route);
		if (url) {
			window.open(url, "_blank");
		}
	}

	/**
	 * Abre Apple Maps con la ruta.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 */
	static openInAppleMaps(route) {
		const url = this.toAppleMapsURL(route);
		if (url) {
			window.open(url, "_blank");
		}
	}

	/**
	 * Verifica si Web Share API está disponible.
	 *
	 * @returns {boolean} True si está disponible
	 */
	static canShare() {
		return "share" in navigator;
	}

	/**
	 * Verifica si se pueden compartir archivos.
	 *
	 * @returns {boolean} True si se pueden compartir archivos
	 */
	static canShareFiles() {
		return "canShare" in navigator && navigator.canShare({ files: [] });
	}

	/**
	 * Comparte la ruta usando Web Share API.
	 *
	 * @param {RouteData} route - Datos de la ruta
	 * @param {'gpx'|'kml'} [format='gpx'] - Formato a compartir
	 * @returns {Promise<boolean>} True si se compartió exitosamente
	 */
	static async share(route, format = "gpx") {
		if (!this.canShare()) {
			return false;
		}

		const name = route.name || "Recorrido";

		try {
			// Intentar compartir como archivo si está disponible
			if (this.canShareFiles()) {
				const content =
					format === "kml" ? this.toKML(route) : this.toGPX(route);
				const mimeType =
					format === "kml"
						? "application/vnd.google-earth.kml+xml"
						: "application/gpx+xml";
				const filename = `recorrido-${route.name || route.id || "track"}.${format}`;

				const file = new File([content], filename, { type: mimeType });

				// Verificar si el navegador puede compartir este archivo
				if (navigator.canShare({ files: [file] })) {
					await navigator.share({
						title: name,
						text: `Recorrido: ${name}`,
						files: [file],
					});
					return true;
				}
			}

			// Fallback: compartir URL de Google Maps
			const url = this.toGoogleMapsURL(route);
			await navigator.share({
				title: name,
				text: `Recorrido: ${name}`,
				url: url,
			});
			return true;
		} catch (error) {
			// El usuario canceló o hubo un error
			if (error.name !== "AbortError") {
				console.error("Error sharing:", error);
			}
			return false;
		}
	}

	/**
	 * Escapa caracteres especiales para XML.
	 *
	 * @private
	 * @param {string} str - String a escapar
	 * @returns {string} String escapado
	 */
	static #escapeXml(str) {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}

	/**
	 * Samplea puntos equidistantemente para reducir cantidad.
	 *
	 * @private
	 * @param {RoutePoint[]} points - Array de puntos
	 * @param {number} maxPoints - Máximo de puntos deseados
	 * @returns {RoutePoint[]} Puntos sampleados
	 */
	static #samplePoints(points, maxPoints) {
		if (points.length <= maxPoints) {
			return points;
		}

		const result = [];
		const step = (points.length - 1) / (maxPoints - 1);

		for (let i = 0; i < maxPoints; i++) {
			const index = Math.round(i * step);
			result.push(points[index]);
		}

		return result;
	}
}
