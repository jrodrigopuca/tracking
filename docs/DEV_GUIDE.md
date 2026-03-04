git clone https://github.com/jrodrigopuca/tracking.git
document.getElementById('start-button').addEventListener('click', () => {
document.addEventListener('click', (e) => {

# Guía de Desarrollo - Tracking App

Guía práctica para montar el entorno, ejecutar y depurar la app de tracking.

---

## 🚀 Quick Start

### Requisitos previos

```bash
node >= 18   # o bun >= 1.0
# No se requiere API key (Leaflet + OpenStreetMap por CDN)
```

### Instalación y ejecución

```bash
git clone https://github.com/jrodrigopuca/tracking.git
cd tracking

# Dependencias
bun install   # o npm install

# Servidor de desarrollo (Parcel)
	return div.innerHTML;

# Abrir
# http://localhost:1234/index.html    (dashboard)
# http://localhost:1234/track.html    (tracking)
# http://localhost:1234/track.html?simulate=true  (modo simulación)
```

### Build de producción

```bash
bun run build   # o npm run build
# Salida en dist/
```

---

## 📁 Estructura del proyecto

```
src/
├── app.js                 # Entrada y composición de servicios
├── core/                  # Servicios core (Map, GeoLocation, Simulator, Storage, Export, WakeLock, EventBus, Distance)
├── models/Route.js        # Modelo de ruta y métricas
├── ui/                    # UIController + Notifications
├── index.html             # Dashboard + import/export JSON
├── track.html             # Tracking en vivo (control, waypoints, export)
├── route-detail.html      # Visor con replay/export/delete
└── styles.css             # Estilos
docs/                      # Documentación
src/__tests__/             # Tests Vitest (152 tests)
package.json, bun.lockb, vitest.config.js
```

---

## 🛠️ Stack tecnológico

- **Leaflet 1.9.4 + OpenStreetMap** (CDN)
- **JavaScript ES6+**, HTML, CSS (sin framework)
- **Parcel 2.16** para dev/build
- **Vitest + happy-dom** para unit tests
- APIs del navegador: Geolocation, DeviceOrientation, Battery (opcional), Wake Lock, Fullscreen, Web Share, LocalStorage

---

## 🔧 Comandos útiles

```bash
# Desarrollo
bun start            # parcel --no-cache

# Build
bun run build        # limpia dist/.parcel-cache y construye

# Tests
bun test             # Vitest interactivo
bun test:run         # Vitest en modo CI
bun test:coverage    # Cobertura con @vitest/coverage-v8

# Limpieza manual
rm -rf dist .parcel-cache
```

---

## 📝 Convenciones rápidas

- CamelCase para variables y funciones; PascalCase para clases.
- Constantes en UPPER_SNAKE_CASE.
- IDs/clases HTML en kebab-case.
- Comentarios breves y solo cuando aporten contexto; mensajes de UI en español.
- Usa Prettier (`prettierrc.json`) antes de commitear.

---

## 🐛 Debugging rápido

- **Mapa no se muestra**: verifica que `#map` tenga altura > 0 y que Leaflet CSS/JS se cargaron (CDN). Llama `map.invalidateSize()` tras cambios de layout (UIController ya lo hace en `resize`).
- **Geolocalización falla**: revisa permisos en DevTools (`navigator.permissions.query({ name: "geolocation" })`); el modo simulación funciona sin GPS real.
- **Precisión baja**: el indicador muestra la precisión (`±Xm`). En batería baja se reduce precisión; desactiva conectando el cargador.
- **Rutas pendientes**: se guardan en `localStorage` como `tracking_pending_route`. El banner del dashboard permite continuar o descartar.
- **Wake Lock/Share**: no todos los navegadores lo soportan; la app degrada silenciosamente y muestra toast de advertencia.

---

## 🧪 Testing

- Framework: **Vitest** con **happy-dom** (DOM simulado). Total: **152 tests** en `src/__tests__`.
- Ejecutar:
  - `bun test` durante el desarrollo.
  - `bun test:run` en CI.
  - `bun test:coverage` para reporte V8.

Ejemplo (DistanceCalculator):

```javascript
import { describe, it, expect } from "vitest";
import { DistanceCalculator } from "../core/DistanceCalculator.js";

describe("DistanceCalculator", () => {
	it("calcula 0 km para mismas coords", () => {
		expect(DistanceCalculator.haversine(10, 10, 10, 10)).toBe(0);
	});
});
```

---

## 🔐 Seguridad y datos

- No se usan API keys (OSM). Igual evita commitear secretos.
- Valida y sanitiza entradas al importar JSON (`StorageService.importFromJson` ya verifica lat/lng numéricos).
- LocalStorage es legible por el usuario; no almacenar datos sensibles.

---

## 🤝 Contribuir

- Sigue mensajes de commit tipo Conventional Commits.
- Abre PR con descripción clara y evidencia (tests o captura).
- Antes de subir: `bun test:run` y `bun run build` para asegurar que el bundle sigue funcionando.
  };

element.innerHTML = sanitize(userInput);

// Mejor aún: Usar textContent
element.textContent = userInput;

````

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
````

---

## 📚 Recursos Útiles

### Documentación Oficial

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Geolocation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [LocalStorage - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Parcel Documentation](https://parceljs.org/)

### Tutoriales

- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [GPS Accuracy](https://www.gps.gov/systems/gps/performance/accuracy/)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)

### Herramientas

- [Leaflet Providers Preview](https://leaflet-extras.github.io/leaflet-providers/preview/) (tiles alternativos)
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

### Mapas no cargan (Leaflet/OSM)

1. Verificar que los scripts y CSS de Leaflet carguen (DevTools → Network, sin 404)
2. Confirmar que la página sirva por HTTPS (requerido para geolocalización precisa)
3. Revisar bloqueos por adblock/VPN y la política de uso de tiles de OSM
4. Probar un proveedor alternativo de tiles (ver Leaflet Providers) si el CDN está caído

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
