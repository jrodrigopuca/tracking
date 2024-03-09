//import dotenv from "dotenv";
//dotenv.config();

const GEO_API_KEY = process.env.GEO_API_KEY || "";

let watchLocation = null;
let map;
let platform;
let path = [];
let distance = 0;
let polyline;
let lastAddedPointTime = 0;

const checkParamId = () => {
	const urlParams = new URLSearchParams(window.location.search);
	const idByParams = urlParams.get("id");
	if (idByParams) {
		const actualItems = JSON.parse(localStorage.getItem("routes")) || [];
		const item = actualItems.find((item) => item.id.toString() === idByParams);
		console.log(item);
		if (item) {
			(path = item.path), (distance = item.distance);
			console.log("path", path);
			//polyline = null;

			if (path.length > 1) {
				const lineString = new H.geo.LineString();
				path.forEach((pos) => {
					lineString.pushPoint(new H.geo.Point(pos.lat, pos.lng));
				});
				const polyline2 = new H.map.Polyline(lineString, {
					style: { strokeColor: "blue", lineWidth: 3 },
				});
				console.log(polyline2);
				map.addObject(polyline2);
			}
			map.setCenter(item.path[0]);
		}
	}
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
	const radlat1 = (Math.PI * lat1) / 180;
	const radlat2 = (Math.PI * lat2) / 180;
	const radlon1 = (Math.PI * lon1) / 180;
	const radlon2 = (Math.PI * lon2) / 180;
	const theta = lon1 - lon2;
	const radtheta = (Math.PI * theta) / 180;
	let dist =
		Math.sin(radlat1) * Math.sin(radlat2) +
		Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = (dist * 180) / Math.PI;
	dist = dist * 60 * 1.1515;
	dist = dist * 1.609344 * 1000; // Convert to meters
	return dist;
};

const updateDistance = (pos) => {
	if (path.length > 1) {
		distance += calculateDistance(
			path[path.length - 2].lat,
			path[path.length - 2].lng,
			pos.lat,
			pos.lng
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

	document.getElementById("info").innerHTML = `
          <p>Distancia recorrida: ${distance.toFixed(2)} metros</p>
          <p>Puntos recorridos: ${path.length}</p>
        `;
};

const updateList = (pos) => {
	const ul = document.getElementById("list");
	ul.innerHTML += `<li>Lat:${pos.lat}  Lng:${pos.lng}</li>`;
};

const initConditions = () => {
	// Cargar la API de Here Maps
	platform = new H.service.Platform({
		apikey: GEO_API_KEY,
	});
	// Crear una instancia del mapa
	const defaultLayers = platform.createDefaultLayers();

	map = new H.Map(
		document.getElementById("map-container"),
		defaultLayers.vector.normal.map,
		{
			zoom: 18,
			center: { lat: 37.386052, lng: -122.083851 },
			pixelRatio: window.devicePixelRatio || 1,
			canvas: document.createElement("canvas", {
				willReadFrequently: true,
			}),
		}
	);

	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
};

if (navigator.geolocation) {
	initConditions();
	checkParamId();
	window.addEventListener("resize", () => map.getViewPort().resize());
} else {
	document.getElementById("info").innerHTML = `Geolocalización no soportada`;
}

const stopTracking = () => {
	if (watchLocation) {
		navigator.geolocation.clearWatch(watchLocation);
	}
	document.getElementById("start-button").style.display = "block";
	document.getElementById("stop-button").style.display = "none";
};

const startTracking = () => {
	if (navigator.geolocation) {
    document.getElementById("start-button").style.display = "none";
    document.getElementById("stop-button").style.display = "block";

		watchLocation = navigator.geolocation.watchPosition((position) => {
			// Posición actual
			const actualPosition = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			};

			// Verificar si el nuevo punto es igual a alguno de los puntos existentes
			const isNewPoint = !path.some((point) => {
				return (
					point.lat === actualPosition.lat && point.lng === actualPosition.lng
				);
			});

			// Verificar si la diferencia de tiempo entre el nuevo punto y el último punto agregado es mayor o igual a 10 segundos
			const currentTime = new Date().getTime();
			const timeDifference = currentTime - lastAddedPointTime;
			const isTimeDifferenceValid = timeDifference >= 10000; // 10 segundos en milisegundos

      if (isNewPoint && isTimeDifferenceValid){
        lastAddedPointTime = currentTime;
        path.push(actualPosition);
        map.addObject(new H.map.Marker(actualPosition));
        map.setCenter(actualPosition);
        updateList(actualPosition);
        updateDistance(actualPosition);
      }
		});
	}
};

const exportPath = () => {
	const jsonData = JSON.stringify(path);
	const blob = new Blob([jsonData], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "recorrido.json";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

const savePath = () => {
	const actualItems = JSON.parse(localStorage.getItem("routes")) || [];
	const route = {
		name: "Route-" + Date.now(),
		id: Date.now(),
		distance: distance,
		path: path,
	};
	actualItems.push(route);
	localStorage.setItem("routes", JSON.stringify(actualItems));
};

const zoomIn = () => {
	map.setZoom(map.getZoom() + 1);
};

const zoomOut = () => {
	map.setZoom(map.getZoom() - 1);
};

const back = () => {
	window.location.href = "index.html";
};

document
	.getElementById("start-button")
	.addEventListener("click", startTracking);
document.getElementById("stop-button").addEventListener("click", stopTracking);
document.getElementById("export-button").addEventListener("click", exportPath);
document.getElementById("zoom-in-button").addEventListener("click", zoomIn);
document.getElementById("zoom-out-button").addEventListener("click", zoomOut);
document.getElementById("save-button").addEventListener("click", savePath);
document.getElementById("back-button").addEventListener("click", back);
