# Known Issues - Tracking App

Este documento detalla todos los problemas conocidos, bugs y deuda técnica del proyecto.

## 🐛 Bugs Críticos

### 1. Función `actualTracking()` no guarda puntos

**Ubicación**: [track.js](src/track.js#L188-L222)

**Descripción**: 
La función `actualTracking()` captura coordenadas GPS y las muestra en el mapa, pero NO las agrega al array `path`, lo que significa que:
- No se calculan distancias
- No se pueden guardar los puntos
- No se pueden exportar

**Código problemático**:
```javascript
const actualTracking = () => {
	if (navigator.geolocation) {
		watchLocation = navigator.geolocation.watchPosition((position) => {
			const actualPosition = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			};
			
			// ... validaciones ...
			
			if (isNewPoint && isTimeDifferenceValid) {
				lastAddedPointTime = currentTime;
				// ❌ FALTA: path.push(actualPosition);
				map.addObject(new H.map.Marker(actualPosition));
				map.setCenter(actualPosition);
				updateList(actualPosition);
				updateDistance(actualPosition); // No tendrá efecto sin agregar a path
			}
		});
	}
};
```

**Solución**:
```javascript
if (isNewPoint && isTimeDifferenceValid) {
	lastAddedPointTime = currentTime;
	path.push(actualPosition); // ✅ AGREGAR ESTA LÍNEA
	map.addObject(new H.map.Marker(actualPosition));
	map.setCenter(actualPosition);
	updateList(actualPosition);
	updateDistance(actualPosition);
}
```

**Impacto**: 🔴 ALTO - Funcionalidad completamente rota

**Reportado**: Análisis inicial

---

### 2. Sin validación de API Key

**Ubicación**: [track.js](src/track.js#L4)

**Descripción**:
Si la API key de HERE Maps es inválida o está vacía, la aplicación falla silenciosamente sin dar feedback al usuario.

**Código actual**:
```javascript
const GEO_API_KEY = process.env.GEO_API_KEY || "";
```

**Problema**:
1. Si `process.env.GEO_API_KEY` no existe, se usa string vacío
2. La inicialización del mapa falla sin mensaje de error
3. Usuario ve pantalla en blanco sin saber qué pasó

**Solución propuesta**:
```javascript
const GEO_API_KEY = process.env.GEO_API_KEY || "";

if (!GEO_API_KEY || GEO_API_KEY.length === 0) {
	document.getElementById("info").innerHTML = `
		<div class="error">
			⚠️ Error: API Key de HERE Maps no configurada.
			Por favor, configura la variable de entorno GEO_API_KEY.
		</div>
	`;
	throw new Error("HERE Maps API Key is required");
}
```

**Impacto**: 🔴 ALTO - Experiencia de usuario muy pobre

**Workaround**: Hardcodear API key directamente (no recomendado para producción)

---

### 3. Sin manejo de errores de Geolocation

**Ubicación**: [track.js](src/track.js#L142)

**Descripción**:
Las llamadas a `watchPosition()` no incluyen callback de error, por lo que si:
- Usuario niega permisos de ubicación
- GPS no está disponible
- Timeout de geolocalización

...no hay ningún feedback al usuario.

**Código actual**:
```javascript
watchLocation = navigator.geolocation.watchPosition((position) => {
	// success callback
});
// ❌ Falta error callback
```

**Solución propuesta**:
```javascript
watchLocation = navigator.geolocation.watchPosition(
	// Success callback
	(position) => {
		const actualPosition = {
			lat: position.coords.latitude,
			lng: position.coords.longitude,
		};
		// ... resto del código
	},
	// Error callback
	(error) => {
		let errorMessage = "Error desconocido al obtener ubicación";
		
		switch(error.code) {
			case error.PERMISSION_DENIED:
				errorMessage = "Permiso de ubicación denegado. Por favor, habilita la ubicación en tu navegador.";
				break;
			case error.POSITION_UNAVAILABLE:
				errorMessage = "Información de ubicación no disponible.";
				break;
			case error.TIMEOUT:
				errorMessage = "Timeout al solicitar ubicación.";
				break;
		}
		
		document.getElementById("info").innerHTML = `
			<div class="error">⚠️ ${errorMessage}</div>
		`;
		console.error("Geolocation error:", error);
		stopTracking();
	},
	// Options
	{
		enableHighAccuracy: true,
		timeout: 10000,
		maximumAge: 0
	}
);
```

**Impacto**: 🔴 ALTO - Usuario no sabe por qué no funciona

---

## ⚠️ Bugs Menores

### 4. Botón "Stop" visible al iniciar

**Ubicación**: [track.html](src/track.html#L27)

**Descripción**:
Al cargar `track.html`, el botón "Terminar" es visible por defecto, aunque no se ha iniciado tracking.

**Solución**:
```html
<button id="stop-button" class="button" style="display:none;">Terminar</button>
```

**Impacto**: 🟡 BAJO - Estético, pero confunde al usuario

---

### 5. Uso de `alert()` en lugar de notificaciones

**Ubicaciones**:
- [index.html](src/index.html#L38) - Al redirigir a track
- [track.js](src/track.js#L276) - Al guardar track

**Descripción**:
`alert()` bloquea la UI y tiene mala UX. Es mejor usar notificaciones toast.

**Código actual (index.html)**:
```javascript
html += `<li class='list-item'>
  Recorrido ${index + 1}: ${route.id}
  <button class='button' onclick="              
    alert('redirigiendo...');
    window.location.href = 'track.html?id=${route.id}';
  ">Ver</button>
</li>`;
```

**Solución propuesta**:
Implementar sistema de notificaciones toast:
```javascript
// toast.js
export function showToast(message, type = 'info') {
	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	document.body.appendChild(toast);
	
	setTimeout(() => {
		toast.classList.add('show');
	}, 10);
	
	setTimeout(() => {
		toast.classList.remove('show');
		setTimeout(() => toast.remove(), 300);
	}, 3000);
}
```

**Impacto**: 🟡 MEDIO - UX pobre pero funcional

---

### 6. Sin validación de JSON importado

**Ubicación**: [index.html](src/index.html#L59)

**Descripción**:
Al importar un archivo JSON, no se valida que tenga la estructura correcta. Esto puede causar errores si el archivo tiene formato incorrecto.

**Código actual**:
```javascript
reader.onload = (e)=>{
	const jsonData = JSON.parse(e.target.result);
	const id= Date.now()
	const route = {
		name: "Imported-"+ id,
		id: id,
		distance: 0,
		path: jsonData
	}
	routes.push(route);
	localStorage.setItem("routes", JSON.stringify(routes));
	loadRoutes();
}
```

**Problemas**:
1. `JSON.parse()` puede lanzar excepción
2. No valida que `jsonData` sea un array
3. No valida que cada elemento tenga `lat` y `lng`
4. No hay try-catch

**Solución propuesta**:
```javascript
reader.onload = (e) => {
	try {
		const jsonData = JSON.parse(e.target.result);
		
		// Validar que sea array
		if (!Array.isArray(jsonData)) {
			alert('Error: El archivo debe contener un array de coordenadas');
			return;
		}
		
		// Validar estructura de cada punto
		const isValidPath = jsonData.every(point => 
			typeof point === 'object' &&
			typeof point.lat === 'number' &&
			typeof point.lng === 'number'
		);
		
		if (!isValidPath) {
			alert('Error: Formato inválido. Cada punto debe tener lat y lng numéricos');
			return;
		}
		
		const id = Date.now();
		const route = {
			name: "Imported-" + id,
			id: id,
			distance: 0,
			path: jsonData
		};
		
		routes.push(route);
		localStorage.setItem("routes", JSON.stringify(routes));
		loadRoutes();
		alert('Recorrido importado exitosamente');
		
	} catch (error) {
		console.error('Error importing file:', error);
		alert('Error: No se pudo leer el archivo JSON');
	}
};
```

**Impacto**: 🟡 MEDIO - Puede causar crashes

---

### 7. Código duplicado en funciones de tracking

**Ubicación**: [track.js](src/track.js)

**Descripción**:
La lógica de validación temporal y de puntos únicos está duplicada en `startTracking()` y `actualTracking()`.

**Código duplicado**:
```javascript
// En ambas funciones:
const isNewPoint = !path.some((point) => {
	return (
		point.lat === actualPosition.lat && point.lng === actualPosition.lng
	);
});

const currentTime = new Date().getTime();
const timeDifference = currentTime - lastAddedPointTime;
const isTimeDifferenceValid = timeDifference >= 10000;
```

**Solución**: Extraer a función reutilizable
```javascript
const MIN_TIME_BETWEEN_POINTS_MS = 10000;

const shouldAddPoint = (position) => {
	// Verificar si el punto es único
	const isNewPoint = !path.some((point) => 
		point.lat === position.lat && point.lng === position.lng
	);
	
	// Verificar diferencia de tiempo
	const currentTime = Date.now();
	const timeDifference = currentTime - lastAddedPointTime;
	const isTimeDifferenceValid = timeDifference >= MIN_TIME_BETWEEN_POINTS_MS;
	
	return isNewPoint && isTimeDifferenceValid;
};

// Uso:
if (shouldAddPoint(actualPosition)) {
	lastAddedPointTime = Date.now();
	path.push(actualPosition);
	// ... resto del código
}
```

**Impacto**: 🟡 BAJO - Deuda técnica, no afecta funcionalidad

---

### 8. Archivo route.js sin uso

**Ubicación**: [src/route.js](src/route.js)

**Descripción**:
El archivo `route.js` contiene una clase `Route` que parece ser una refactorización incompleta de `track.js`, pero nunca se importa ni se utiliza.

**Problemas**:
1. Código muerto en el proyecto
2. Confunde a nuevos desarrolladores
3. Clase está incompleta (métodos sin terminar)
4. Ocupa espacio innecesario

**Contenido**:
```javascript
class Route {
	platform;
	path = [];
	map;
	// ... propiedades
	
	constructor(elementID) {
		// Inicialización similar a track.js
	}
	
	// Métodos parcialmente implementados
	loadFromId(id) { /* ... */ }
	calculateDistance(lat1, lon1, lat2, lon2) { /* ... */ }
	// ... otros métodos
}
```

**Decisiones posibles**:
1. **Opción A**: Eliminar el archivo
2. **Opción B**: Completar la refactorización y migrar track.js a usar esta clase
3. **Opción C**: Documentar como "trabajo en progreso"

**Recomendación**: Opción B - Completar refactorización para mejor arquitectura

**Impacto**: 🟢 MÍNIMO - Solo confusión, no afecta funcionalidad

---

### 9. Sin funcionalidad de eliminar recorridos

**Ubicación**: [index.html](src/index.html)

**Descripción**:
Los usuarios pueden crear y guardar recorridos, pero no hay forma de eliminarlos desde la UI.

**Solución propuesta**:
```javascript
const deleteRoute = (routeId) => {
	if (!confirm('¿Estás seguro de que deseas eliminar este recorrido?')) {
		return;
	}
	
	const routes = JSON.parse(localStorage.getItem("routes")) || [];
	const updatedRoutes = routes.filter(route => route.id !== routeId);
	localStorage.setItem("routes", JSON.stringify(updatedRoutes));
	loadRoutes();
};

// En la generación de HTML:
html += `<li class='list-item'>
	Recorrido ${index + 1}: ${route.id}
	<button class='button' onclick="redirectToTrack(${route.id})">Ver</button>
	<button class='button button-danger' onclick="deleteRoute(${route.id})">Eliminar</button>
</li>`;
```

**Impacto**: 🟡 MEDIO - Feature missing importante

---

### 10. Variable `polyline` no inicializada correctamente

**Ubicación**: [track.js](src/track.js#L11)

**Descripción**:
```javascript
let polyline;
```

Si se llama `updateDistance()` antes de que `polyline` tenga valor, la condición `if (polyline)` funciona, pero es mejor inicializar explícitamente.

**Solución**:
```javascript
let polyline = null;
```

**Impacto**: 🟢 MÍNIMO - Funciona por casualidad

---

### 11. Mezcla de idiomas (Español/Inglés)

**Ubicación**: Todo el código

**Descripción**:
El código mezcla comentarios y nombres de variables en español e inglés, reduciendo la legibilidad.

**Ejemplos**:
```javascript
// Inglés
const actualPosition = { lat, lng };
const isNewPoint = !path.some(...);

// Español
const calculaDistancia = (lat1, lon1, lat2, lon2) => { ... }
const actualizarDistancia = (pos) => { ... }
```

**Recomendación**: Estandarizar a inglés para código y comentarios técnicos, mantener español solo en UI y mensajes de usuario.

**Impacto**: 🟢 MÍNIMO - Solo mantenibilidad

---

## 🔒 Problemas de Seguridad

### 12. API Key expuesta en cliente

**Ubicación**: [track.js](src/track.js#L4)

**Descripción**:
La API key de HERE Maps está en el código del cliente, lo que significa que cualquiera que inspeccione el código puede extraerla y usarla.

**Riesgo**:
- Uso no autorizado de la API key
- Potencial exceso de cuota
- Costos inesperados

**Solución**:
Implementar proxy backend:

```javascript
// Backend (Node.js/Express)
app.get('/api/maps/config', authenticateUser, (req, res) => {
	res.json({
		apiKey: process.env.HERE_MAPS_API_KEY
	});
});

// Frontend
const loadMapConfig = async () => {
	const response = await fetch('/api/maps/config');
	const { apiKey } = await response.json();
	return apiKey;
};
```

**Mejor solución**: Server-side rendering de tiles o usar HERE Maps con restricciones de dominio.

**Impacto**: 🔴 ALTO - Riesgo de seguridad y costos

---

### 13. Sin límite de almacenamiento LocalStorage

**Ubicación**: Todo el proyecto

**Descripción**:
LocalStorage tiene límite de ~5-10MB dependiendo del navegador. No hay control de cuántos recorridos o cuántos puntos se guardan.

**Escenario problemático**:
1. Usuario graba recorrido muy largo (miles de puntos)
2. Usuario graba múltiples recorridos
3. LocalStorage se llena
4. `setItem()` falla silenciosamente
5. Datos se pierden sin aviso

**Solución propuesta**:
```javascript
const MAX_ROUTES = 50;
const MAX_POINTS_PER_ROUTE = 1000;

const savePath = () => {
	// Validar límite de puntos
	if (path.length > MAX_POINTS_PER_ROUTE) {
		alert(`Recorrido muy largo. Máximo ${MAX_POINTS_PER_ROUTE} puntos permitidos.`);
		return;
	}
	
	let routes = JSON.parse(localStorage.getItem("routes")) || [];
	
	// Validar límite de rutas
	if (routes.length >= MAX_ROUTES) {
		if (confirm(`Has alcanzado el límite de ${MAX_ROUTES} recorridos. ¿Deseas eliminar el más antiguo?`)) {
			routes = routes.slice(1); // Eliminar el primero (más antiguo)
		} else {
			return;
		}
	}
	
	try {
		const newRoute = {
			name: "Route-" + Date.now(),
			id: Date.now(),
			distance: distance,
			path: path,
		};
		
		routes.push(newRoute);
		localStorage.setItem("routes", JSON.stringify(routes));
		alert("Recorrido guardado exitosamente");
	} catch (e) {
		if (e.name === 'QuotaExceededError') {
			alert("Error: No hay espacio suficiente. Elimina recorridos antiguos.");
		} else {
			alert("Error al guardar recorrido");
		}
		console.error(e);
	}
};
```

**Impacto**: 🔴 ALTO - Pérdida de datos del usuario

---

### 14. Uso de innerHTML sin sanitización

**Ubicación**: 
- [index.html](src/index.html#L36)
- [track.js](src/track.js#L78)

**Descripción**:
Se usa `innerHTML` para insertar contenido dinámico sin sanitización, lo que abre la puerta a XSS si los datos vienen de fuente no confiable.

**Código vulnerable (index.html)**:
```javascript
routes.forEach((route, index) => {
	html += `<li class='list-item'>
	  Recorrido ${index + 1}: ${route.id}
	  ...
	</li>`;
});
routesList.innerHTML = html;
```

Si `route.id` o cualquier dato contiene HTML/JavaScript malicioso, se ejecutaría.

**Solución**:
```javascript
// Opción 1: Usar textContent
const li = document.createElement('li');
li.className = 'list-item';
li.textContent = `Recorrido ${index + 1}: ${route.id}`;
routesList.appendChild(li);

// Opción 2: Sanitizar HTML
const sanitize = (str) => {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
};

html += `<li>Recorrido ${index + 1}: ${sanitize(route.id)}</li>`;
```

**Impacto**: 🟡 MEDIO - Riesgo XSS si datos maliciosos entran al sistema

---

## 📱 Problemas de Compatibilidad y UX

### 15. Sin fallback para navegadores sin geolocalización

**Ubicación**: [track.js](src/track.js#L136)

**Descripción**:
```javascript
if (navigator.geolocation) {
	initConditions();
	checkParamId();
	window.addEventListener("resize", () => map.getViewPort().resize());
} else {
	document.getElementById("info").innerHTML = `Geolocalización no soportada`;
}
```

Si la geolocalización no está disponible, solo se muestra un mensaje. No hay forma alternativa de usar la app.

**Solución propuesta**:
Agregar opción de entrada manual de coordenadas:
```javascript
if (!navigator.geolocation) {
	document.getElementById("info").innerHTML = `
		<div class="warning">
			⚠️ Geolocalización no soportada en tu navegador.
			<button onclick="enableManualMode()">Usar modo manual</button>
		</div>
	`;
}

const enableManualMode = () => {
	// Permitir ingresar coordenadas manualmente
	// o usar ubicación de IP (menos precisa)
};
```

**Impacto**: 🟡 MEDIO - Excluye usuarios con navegadores antiguos

---

### 16. Rendimiento con recorridos muy largos

**Ubicación**: [track.js](src/track.js#L70-L75)

**Descripción**:
Al renderizar polylines con miles de puntos, el performance del mapa se degrada significativamente.

**Código actual**:
```javascript
const lineString = new H.geo.LineString();
path.forEach((pos) => {
	lineString.pushPoint(new H.geo.Point(pos.lat, pos.lng));
});
polyline = new H.map.Polyline(lineString, {
	style: { strokeColor: "blue", lineWidth: 3 },
});
```

**Problema**: 
Con 1000+ puntos, el navegador puede hacer lag.

**Solución**: Implementar simplificación de línea (Douglas-Peucker)
```javascript
// Algoritmo Douglas-Peucker para simplificar polyline
const simplifyPath = (points, tolerance = 0.0001) => {
	if (points.length <= 2) return points;
	
	// Implementación del algoritmo...
	// Reduce puntos manteniendo forma general
	
	return simplifiedPoints;
};

// Usar versión simplificada para renderizado
const simplifiedPath = simplifyPath(path);
const lineString = new H.geo.LineString();
simplifiedPath.forEach((pos) => {
	lineString.pushPoint(new H.geo.Point(pos.lat, pos.lng));
});
```

**Impacto**: 🟡 MEDIO - Solo afecta recorridos muy largos

---

### 17. Sin estado de carga (loading)

**Ubicación**: Todo el proyecto

**Descripción**:
No hay indicadores visuales cuando:
- Se inicializa el mapa
- Se captura GPS
- Se guarda en localStorage
- Se carga recorrido desde URL

El usuario no sabe si la app está funcionando o si se trabó.

**Solución**:
```javascript
// Agregar spinner
const showLoader = (message = 'Cargando...') => {
	const loader = document.createElement('div');
	loader.id = 'loader';
	loader.innerHTML = `
		<div class="spinner"></div>
		<p>${message}</p>
	`;
	document.body.appendChild(loader);
};

const hideLoader = () => {
	document.getElementById('loader')?.remove();
};

// Uso
showLoader('Inicializando mapa...');
initConditions();
hideLoader();
```

**Impacto**: 🟢 BAJO - UX, pero funciona sin esto

---

### 18. Sin confirmación antes de acciones destructivas

**Ubicación**: Múltiples lugares

**Descripción**:
No hay confirmación antes de:
- Salir de tracking sin guardar
- Cerrar el navegador con tracking activo
- Sobrescribir datos

**Solución**:
```javascript
// Advertir antes de salir sin guardar
window.addEventListener('beforeunload', (e) => {
	if (path.length > 0 && !saved) {
		e.preventDefault();
		e.returnValue = '¿Seguro que deseas salir? Hay un recorrido sin guardar.';
		return e.returnValue;
	}
});
```

**Impacto**: 🟡 MEDIO - Puede perder datos del usuario

---

## 📊 Resumen por Prioridad

### 🔴 Crítico (Requiere atención inmediata)
1. Función `actualTracking()` no guarda puntos
2. Sin validación de API Key
3. Sin manejo de errores de Geolocation
4. API Key expuesta en cliente
5. Sin límite de almacenamiento LocalStorage

### 🟡 Alta (Debe resolverse pronto)
5. Uso de `alert()` en lugar de notificaciones
6. Sin validación de JSON importado
7. Sin funcionalidad de eliminar recorridos
8. Uso de innerHTML sin sanitización
9. Sin fallback para navegadores sin geolocalización
10. Sin confirmación antes de acciones destructivas

### 🟢 Media (Deuda técnica)
11. Botón "Stop" visible al iniciar
12. Código duplicado en funciones de tracking
13. Archivo route.js sin uso
14. Mezcla de idiomas
15. Variable polyline no inicializada
16. Rendimiento con recorridos largos
17. Sin estado de carga

### ⚪ Baja (Nice to have)
18. Mejoras estéticas varias
19. Optimizaciones menores

---

## 🔧 Plan de Remediación Sugerido

### Fase 1: Bugs Críticos (Sprint 1)
- [ ] Fix `actualTracking()` agregando `path.push()`
- [ ] Implementar validación de API key
- [ ] Agregar error handling a `watchPosition()`
- [ ] Implementar límites de almacenamiento

### Fase 2: Seguridad (Sprint 2)
- [ ] Implementar proxy para API key
- [ ] Sanitizar inputs y outputs
- [ ] Validar JSON imports
- [ ] Agregar confirmaciones

### Fase 3: UX (Sprint 3)
- [ ] Reemplazar alerts con toast notifications
- [ ] Agregar loading states
- [ ] Implementar delete de recorridos
- [ ] Mejorar feedback de errores

### Fase 4: Refactoring (Sprint 4)
- [ ] Completar clase Route y migrar código
- [ ] Eliminar duplicación de código
- [ ] Estandarizar idioma
- [ ] Optimizar rendimiento

---

## 📝 Notas Adicionales

- Todos los issues listados han sido identificados mediante análisis estático del código
- No se han realizado pruebas de penetración de seguridad profundas
- Se recomienda realizar testing en diversos navegadores y dispositivos
- Considerar implementar telemetría para identificar issues en producción
