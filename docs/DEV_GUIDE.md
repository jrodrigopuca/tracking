# Guía de Desarrollo - Tracking App

Guía práctica para desarrolladores que quieren contribuir o trabajar en el proyecto.

---

## 🚀 Quick Start

### Requisitos Previos

```bash
# Node.js/Bun
node >= 18.0.0  # o bun >= 1.0.0

# HERE Maps API Key (requerida)
# Obtener en: https://developer.here.com/
```

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/jrodrigopuca/tracking.git
cd tracking

# Instalar dependencias
bun install
# o
npm install

# Configurar API Key
# Opción 1: Variable de entorno
export GEO_API_KEY="tu_api_key_aqui"

# Opción 2: Hardcodear en track.js (solo desarrollo)
# Editar src/track.js línea 4:
# const GEO_API_KEY = "tu_api_key_aqui";

# Iniciar servidor de desarrollo
bun start
# o
npm start

# Abrir navegador en:
# http://localhost:1234/index.html
```

### Compilar para Producción

```bash
# Build
bun run build
# o
npm run build

# Salida en: dist/
```

---

## 📁 Estructura del Proyecto

```
tracking/
├── src/                      # Código fuente
│   ├── index.html           # Dashboard principal
│   ├── track.html           # Vista de tracking
│   ├── track.js             # Lógica principal (ACTIVO)
│   ├── route.js             # Clase Route (NO USADO)
│   └── styles.css           # Estilos globales
├── dist/                     # Build output (generado)
├── .parcel-cache/           # Cache de Parcel (generado)
├── node_modules/            # Dependencias (generado)
├── package.json             # Configuración npm
├── bun.lockb                # Bun lockfile
├── prettierrc.json          # Config Prettier
├── README.md                # Documentación principal
├── ARCHITECTURE.md          # Documentación técnica
├── KNOWN_ISSUES.md          # Bugs conocidos
├── STATUS.md                # Estado actual
└── DEV_GUIDE.md             # Esta guía
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos (vanilla, sin framework)
- **JavaScript (ES6+)** - Lógica (vanilla, sin framework)

### APIs Externas
- **HERE Maps API v3.1** - Mapas y visualización
- **Geolocation API** - Captura GPS del navegador
- **LocalStorage API** - Persistencia de datos

### Build Tools
- **Parcel 2** - Bundler y dev server
- **Bun** - Runtime y package manager (alternativa a npm)

### Dependencias
```json
{
  "devDependencies": {
    "parcel": "^2.12.0",
    "path-browserify": "^1.0.1", 
    "process": "^0.11.10"
  }
}
```

---

## 🔧 Comandos Útiles

```bash
# Desarrollo
bun start                    # Servidor dev con hot reload
bun run build                # Build para producción

# Linting (si se configura)
bun run lint                 # ESLint (no configurado aún)
bun run format               # Prettier (configurado)

# Testing (por implementar)
bun test                     # Ejecutar tests
bun test:watch               # Tests en modo watch
bun test:coverage            # Coverage report

# Limpieza
rm -rf dist .parcel-cache    # Limpiar cache y build
```

---

## 📝 Convenciones de Código

### Estilo de Código

#### JavaScript

```javascript
// ✅ CORRECTO
const calculateDistance = (lat1, lon1, lat2, lon2) => {
	const radlat1 = (Math.PI * lat1) / 180;
	// ... resto del código
	return distance;
};

// Constantes en UPPER_SNAKE_CASE
const MAX_DISTANCE = 1000;
const MIN_TIME_BETWEEN_POINTS = 10000;

// Variables y funciones en camelCase
let currentPosition;
const getCurrentLocation = () => { /* ... */ };

// Clases en PascalCase
class RouteManager {
	// ...
}
```

#### HTML

```html
<!-- ✅ CORRECTO: Usar kebab-case para IDs y clases -->
<div id="map-container"></div>
<button class="button button-primary">Click</button>

<!-- ❌ INCORRECTO -->
<div id="mapContainer"></div>
<div id="map_container"></div>
```

#### CSS

```css
/* ✅ CORRECTO: Usar kebab-case */
.list-item {
	padding: 12px;
}

#map-container {
	height: 300px;
}

/* ❌ INCORRECTO */
.listItem { }
.list_item { }
```

### Comentarios

```javascript
// ✅ CORRECTO: Comentarios descriptivos en inglés (código)
// Calculate distance using Haversine formula
const distance = calculateDistance(lat1, lon1, lat2, lon2);

// ✅ CORRECTO: Mensajes de usuario en español
alert('Recorrido guardado exitosamente');

// ❌ INCORRECTO: Comentarios obvios
// This is a variable
let x = 5;
```

### Formateo

Usar Prettier (ya configurado en `prettierrc.json`):

```bash
# Formatear todo el proyecto
npx prettier --write "src/**/*.{js,html,css}"
```

---

## 🎨 Patrones de Diseño Recomendados

### 1. Module Pattern

```javascript
// Encapsular funcionalidad en módulos
const MapManager = (() => {
	let map;
	let platform;
	
	const init = (apiKey) => {
		platform = new H.service.Platform({ apikey: apiKey });
		// ...
	};
	
	const addMarker = (position) => {
		// ...
	};
	
	return {
		init,
		addMarker
	};
})();

// Uso
MapManager.init(API_KEY);
MapManager.addMarker({ lat: 37.386, lng: -122.083 });
```

### 2. Event-Driven

```javascript
// Usar event listeners para desacoplar
document.getElementById('start-button').addEventListener('click', () => {
	TrackingManager.start();
});

// Mejor: Delegar eventos
document.addEventListener('click', (e) => {
	if (e.target.id === 'start-button') {
		TrackingManager.start();
	}
});
```

### 3. Error Handling

```javascript
// ✅ CORRECTO: Siempre manejar errores
const loadRoute = async (id) => {
	try {
		const routes = JSON.parse(localStorage.getItem('routes')) || [];
		const route = routes.find(r => r.id === id);
		
		if (!route) {
			throw new Error(`Route ${id} not found`);
		}
		
		return route;
	} catch (error) {
		console.error('Error loading route:', error);
		showNotification('Error al cargar recorrido', 'error');
		return null;
	}
};

// ❌ INCORRECTO: Sin manejo de errores
const loadRoute = (id) => {
	const routes = JSON.parse(localStorage.getItem('routes'));
	return routes.find(r => r.id === id);
};
```

---

## 🐛 Debugging

### Herramientas

#### Chrome DevTools

```javascript
// Breakpoints
debugger; // Pausar ejecución aquí

// Console logging
console.log('Position:', position);
console.table(path); // Para arrays/objetos
console.time('tracking'); // Medir performance
// ... código a medir
console.timeEnd('tracking');

// Network
// Ver llamadas a HERE Maps API en tab Network
```

#### Geolocation Override

Para testing sin GPS físico:

```javascript
// En Chrome DevTools > Sensors
// Cambiar Location a custom coordinates
// O usar extensión "Location Guard"
```

#### LocalStorage Inspection

```javascript
// Ver datos guardados
console.log(localStorage.getItem('routes'));

// Parsear y ver
JSON.parse(localStorage.getItem('routes'));

// Limpiar (cuidado!)
localStorage.clear();
```

### Common Issues

#### 1. Mapa no se muestra

```javascript
// Verificar API key
console.log('API Key:', GEO_API_KEY);

// Verificar inicialización
console.log('Platform:', platform);
console.log('Map:', map);

// Verificar tamaño del contenedor
const container = document.getElementById('map-container');
console.log('Container size:', container.offsetWidth, container.offsetHeight);
```

#### 2. GPS no funciona

```javascript
// Verificar permisos
navigator.permissions.query({ name: 'geolocation' }).then(result => {
	console.log('Geolocation permission:', result.state);
});

// Probar posición única
navigator.geolocation.getCurrentPosition(
	pos => console.log('Position:', pos),
	err => console.error('Error:', err)
);
```

#### 3. LocalStorage lleno

```javascript
// Calcular uso
const calculateStorageSize = () => {
	let total = 0;
	for (let key in localStorage) {
		if (localStorage.hasOwnProperty(key)) {
			total += localStorage[key].length + key.length;
		}
	}
	return (total / 1024).toFixed(2) + ' KB';
};

console.log('Storage used:', calculateStorageSize());
```

---

## 🧪 Testing

### Unit Tests (Por implementar)

```javascript
// Ejemplo con Jest

// tests/calculateDistance.test.js
import { calculateDistance } from '../src/track.js';

describe('calculateDistance', () => {
	test('should calculate correct distance between two points', () => {
		const lat1 = 37.386052;
		const lon1 = -122.083851;
		const lat2 = 37.386152;
		const lon2 = -122.083951;
		
		const distance = calculateDistance(lat1, lon1, lat2, lon2);
		
		expect(distance).toBeGreaterThan(0);
		expect(distance).toBeLessThan(20); // ~15 metros esperados
	});
	
	test('should return 0 for same coordinates', () => {
		const distance = calculateDistance(37.386, -122.083, 37.386, -122.083);
		expect(distance).toBe(0);
	});
});
```

### Integration Tests (Por implementar)

```javascript
// tests/integration/tracking.test.js
import { JSDOM } from 'jsdom';

describe('Tracking Integration', () => {
	let dom;
	
	beforeEach(() => {
		dom = new JSDOM(/* index.html content */);
		global.document = dom.window.document;
		global.window = dom.window;
	});
	
	test('should load routes from localStorage', () => {
		localStorage.setItem('routes', JSON.stringify([
			{ id: 1, name: 'Test Route', path: [] }
		]));
		
		loadRoutes();
		
		const list = document.getElementById('routes-list');
		expect(list.children.length).toBe(1);
	});
});
```

### E2E Tests (Por implementar)

```javascript
// tests/e2e/tracking.spec.js con Playwright
import { test, expect } from '@playwright/test';

test('should start tracking', async ({ page }) => {
	await page.goto('http://localhost:1234/track.html');
	
	// Mock geolocation
	await page.context().grantPermissions(['geolocation']);
	await page.context().setGeolocation({ latitude: 37.386, longitude: -122.083 });
	
	// Click start
	await page.click('#start-button');
	
	// Verify UI changes
	await expect(page.locator('#start-button')).toBeHidden();
	await expect(page.locator('#stop-button')).toBeVisible();
});
```

---

## 🔐 Seguridad

### Buenas Prácticas

#### 1. Never commit API keys

```bash
# .gitignore
.env
.env.local
*.key
secrets.json
```

```javascript
// ✅ CORRECTO: Usar variables de entorno
const API_KEY = process.env.GEO_API_KEY;

// ❌ INCORRECTO: Hardcodear
const API_KEY = "abc123...";
```

#### 2. Sanitize inputs

```javascript
// ✅ CORRECTO: Sanitizar
const sanitize = (str) => {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
};

element.innerHTML = sanitize(userInput);

// Mejor aún: Usar textContent
element.textContent = userInput;
```

#### 3. Validate data

```javascript
// ✅ CORRECTO: Validar antes de usar
const isValidPosition = (pos) => {
	return (
		typeof pos === 'object' &&
		typeof pos.lat === 'number' &&
		typeof pos.lng === 'number' &&
		pos.lat >= -90 && pos.lat <= 90 &&
		pos.lng >= -180 && pos.lng <= 180
	);
};

if (isValidPosition(position)) {
	path.push(position);
}
```

---

## 📚 Recursos Útiles

### Documentación Oficial

- [HERE Maps JavaScript API](https://developer.here.com/documentation/maps/3.1.48.0/dev_guide/index.html)
- [Geolocation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [LocalStorage - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Parcel Documentation](https://parceljs.org/)

### Tutoriales

- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [GPS Accuracy](https://www.gps.gov/systems/gps/performance/accuracy/)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)

### Herramientas

- [HERE Maps Playground](https://developer.here.com/documentation/examples/maps-js/index.html)
- [GeoJSON Validator](https://geojsonlint.com/)
- [Can I Use](https://caniuse.com/) - Compatibilidad de browsers

---

## 🤝 Contribuir

### Workflow

1. **Fork** el repositorio
2. **Clone** tu fork
   ```bash
   git clone https://github.com/tu-usuario/tracking.git
   ```
3. **Create branch** para tu feature
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Commit** tus cambios
   ```bash
   git commit -m "Add amazing feature"
   ```
5. **Push** a tu branch
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open Pull Request**

### Commit Messages

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Formato
<tipo>(<scope>): <descripción>

# Ejemplos
feat(tracking): add distance calculation
fix(map): resolve marker rendering issue
docs(readme): update installation steps
refactor(track): extract validation logic
test(distance): add unit tests
chore(deps): update parcel to 2.12.0
```

### Tipos de commits
- `feat`: Nueva funcionalidad
- `fix`: Bug fix
- `docs`: Documentación
- `style`: Formateo (no afecta código)
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Mantenimiento

### Pull Request Template

```markdown
## Descripción
Descripción clara de los cambios

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva feature
- [ ] Breaking change
- [ ] Documentación

## Testing
- [ ] Tests añadidos/actualizados
- [ ] Tests pasan
- [ ] Testing manual realizado

## Checklist
- [ ] Código sigue el estilo del proyecto
- [ ] Self-review realizado
- [ ] Documentación actualizada
- [ ] Sin warnings de console
```

---

## 🆘 Troubleshooting

### Build failures

```bash
# Limpiar cache
rm -rf .parcel-cache dist node_modules
bun install
bun start
```

### Hot reload no funciona

```bash
# Reiniciar Parcel
# Ctrl+C para detener
bun start --no-cache
```

### HERE Maps no carga

1. Verificar API key válida
2. Verificar límites de cuota en dashboard HERE
3. Verificar network requests en DevTools
4. Probar con API key diferente

### GPS no preciso

- Usar en exterior (mejor señal satelital)
- Habilitar "alta precisión" en dispositivo
- Esperar ~30 segundos para fix inicial
- Verificar opciones de `watchPosition`:
  ```javascript
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
  ```

---

## 📞 Soporte

### Preguntas

- GitHub Discussions (por configurar)
- Issues en GitHub
- Email: [por definir]

### Bugs

Reportar en GitHub Issues con:
1. Descripción del problema
2. Pasos para reproducir
3. Comportamiento esperado vs actual
4. Screenshots si aplica
5. Browser y versión
6. Console errors

### Feature Requests

Usar GitHub Issues con label "enhancement"

---

## 📄 Licencia

MIT License - Libre de usar, modificar y distribuir

---

**Happy Coding! 🚀**
