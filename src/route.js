class Route {
	platform;
	path = [];
	map;
	watchLocation;
	distance;

	TIME_MIN_DIFERENCE = 10000; //10 seg
	GEO_API_KEY = "";
	INITIAL_LAT = 37.386052;
	INITIAL_LNG = -122.083851;

	constructor(elementID) {
		this.platform = new H.service.Platform({ apikey: GEO_API_KEY });
		// Crear una instancia del mapa
		const defaultLayers = platform.createDefaultLayers();
		this.map = new H.Map(
			document.getElementById(elementID),
			defaultLayers.vector.normal.map,
			{
				zoom: 18,
				center: { lat: this.INITIAL_LAT, lng: this.INITIAL_LNG },
				pixelRatio: window.devicePixelRatio || 1,
				canvas: document.createElement("canvas", {
					willReadFrequently: true,
				}),
			}
		);

		new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
	}

	getFromLocalStorage() {
		return JSON.parse(localStorage.getItem("routes")) || [];
	}

	loadFromId(id) {
		if (id) {
			const actualItems = this.getFromLocalStorage;
			const item = actualItems.find((item) => item.id.toString() === id);
			if (item) {
				this.path = item.path;
				this.distance = item.distance;
				if (this.path.length > 1) {
					const lineString = new H.geo.LineString();
					this.path.forEach((pos) => {
						lineString.pushPoint(new H.geo.Point(pos.lat, pos.lng));
					});
					const polyline = new H.map.Polyline(lineString, {
						style: { strokeColor: "blue", lineWidth: 3 },
					});
					map.addObject(polyline);
				}
				map.setCenter(item.path[0]);
			}
		}
	}

	calculateDistance(lat1, lon1, lat2, lon2) {
		const radlat1 = (Math.PI * lat1) / 180;
		const radlat2 = (Math.PI * lat2) / 180;
		const theta = lon1 - lon2;
		const radtheta = (Math.PI * theta) / 180;
		let distance =
			Math.sin(radlat1) * Math.sin(radlat2) +
			Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		distance = Math.acos(distance);
		distance = (distance * 180) / Math.PI;
		distance = distance * 60 * 1.1515;
		distance = distance * 1.609344 * 1000; // Convert to meters
		return distance;
	}

	updateDistance(position) {
		if (path.length > 1) {
			distance += calculateDistance(
				path[path.length - 2].lat,
				path[path.length - 2].lng,
				position.lat,
				position.lng
			);

			if (polyline) {
				map.removeObject(polyline);
			}

			const lineString = new H.geo.LineString();
			path.forEach((pos) => {
				lineString.pushPoint(new H.geo.Point(pos.lat, pos.lng));
			});
			polyline = new H.map.Polyline(lineString, {
				style: { strokeColor: "blue", lineWidth: 3 },
			});
			map.addObject(polyline);
		}
	}

	startTracking() {
		if (navigator.geolocation) {
			this.watchLocation = navigator.geolocation.watchPosition((position) => {
				// Posición actual
				const actualPosition = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				};

				// Verificar si el nuevo punto es igual a alguno de los puntos existentes
				const isNewPoint = !this.path.some((point) => {
					return (
						point.lat === actualPosition.lat && point.lng === actualPosition.lng
					);
				});

				// Verificar si la diferencia de tiempo entre el nuevo punto y el último punto agregado es mayor o igual a 10 segundos
				const currentTime = new Date().getTime();
				const timeDifference = currentTime - lastAddedPointTime;
				const isTimeDifferenceValid = timeDifference >= TIME_MIN_DIFERENCE; // 10 segundos en milisegundos

				if (isNewPoint && isTimeDifferenceValid) {
					lastAddedPointTime = currentTime;
					path.push(actualPosition);
					map.addObject(new H.map.Marker(actualPosition));
					map.setCenter(actualPosition);

					updateDistance(actualPosition);
				}
			});
		} else {
			throw new Error("Geolocation not supported");
		}
	}

	stopTracking() {
		if (watchLocation) {
			navigator.geolocation.clearWatch(watchLocation);
		}
	}
}
