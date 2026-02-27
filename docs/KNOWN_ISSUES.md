# Known Issues & Limitaciones - Tracking App v2.0

Este documento detalla limitaciones conocidas y mejoras pendientes del proyecto.

**Última actualización**: Febrero 27, 2026  
**Versión**: 2.0.0

---

## ✅ Issues Resueltos en v2.0

La mayoría de los issues de v1.0 fueron resueltos con la migración a Leaflet:

| Issue Original                      | Estado                             |
| ----------------------------------- | ---------------------------------- |
| `actualTracking()` no guarda puntos | ✅ Nueva arquitectura              |
| Sin validación de API Key           | ✅ OpenStreetMap no requiere key   |
| Sin manejo de errores Geolocation   | ✅ GeoLocationService con handlers |
| Uso de `alert()`                    | ✅ Sistema de notificaciones toast |
| Código duplicado                    | ✅ Servicios modulares SOLID       |
| API Key expuesta                    | ✅ No hay API key                  |

---

## 🟡 Limitaciones Actuales

### 1. Sin UI para eliminar rutas

**Descripción**: `StorageService.delete(id)` existe pero no hay botón en UI.

**Workaround**: DevTools → Application → LocalStorage

**Prioridad**: Media

---

### 2. Límite de LocalStorage

**Descripción**: LocalStorage tiene límite de ~5-10MB.

**Prioridad**: Baja (poco probable llenar con rutas normales)

---

### 3. Sin soporte offline (PWA)

**Descripción**: Requiere conexión para cargar tiles del mapa.

**Prioridad**: Media

---

### 4. Wake Lock no soportado en Firefox

**Descripción**: Screen Wake Lock API no disponible en Firefox.

**Mitigación**: El código detecta soporte y degrada gracefully.

---

## 🔧 Mejoras Pendientes

- [ ] UI para eliminar rutas
- [ ] PWA + Service Worker
- [ ] Exportación GPX
- [ ] Filtros en historial
- [ ] Configuración de unidades

---

## 📱 Compatibilidad

| Navegador   | Estado           |
| ----------- | ---------------- |
| Chrome 80+  | ✅ Completo      |
| Firefox 75+ | ⚠️ Sin Wake Lock |
| Safari 14+  | ✅ Completo      |
| Edge 80+    | ✅ Completo      |
