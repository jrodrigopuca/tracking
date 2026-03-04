# Known Issues & Limitaciones - Tracking App v2.0

Este documento detalla limitaciones conocidas y mejoras pendientes del proyecto.

**Última actualización**: Febrero 27, 2026  
**Versión**: 2.0.0

---

# Known Issues & Limitaciones - Tracking App v2.0

Documento vivo con las limitaciones conocidas de la versión actual.

---

## 🟡 Limitaciones Actuales

### 1) Exportación en `route-detail.html`

- **Descripción**: Los botones GPX/KML/Compartir usan una firma antigua de `ExportService` y fallan al intentar exportar.
- **Workaround**: Exportar el recorrido al finalizarlo desde `track.html` o descargar el JSON desde el dashboard y convertirlo externamente.
- **Prioridad**: Alta

### 2) Sin soporte offline/PWA

- **Descripción**: No hay Service Worker; requiere conexión para cargar tiles de OpenStreetMap y assets.
- **Prioridad**: Media

### 3) Límite de LocalStorage

- **Descripción**: Almacenamiento ~5–10 MB; rutas muy largas pueden no guardarse.
- **Prioridad**: Baja

### 4) Wake Lock/Web Share en navegadores no soportados

- **Descripción**: Wake Lock no funciona en Firefox; Web Share solo en móviles/desktop compatibles.
- **Mitigación**: La app muestra avisos y degrada a comportamiento estándar.

---

## 🔧 Mejoras Pendientes

- [ ] Corregir exportación/compartir en `route-detail.html`
- [ ] PWA + cache de tiles/assets
- [ ] Filtros/búsqueda en historial
- [ ] Configuración de unidades (km/mi)

---

## 📱 Compatibilidad

| Navegador   | Estado           |
| ----------- | ---------------- |
| Chrome 80+  | ✅ Completo      |
| Firefox 75+ | ⚠️ Sin Wake Lock |
| Safari 14+  | ✅ Completo      |
| Edge 80+    | ✅ Completo      |
