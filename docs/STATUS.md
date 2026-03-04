# Estado Actual del Proyecto - Tracking App

**Última actualización**: Marzo 4, 2026  
**Versión**: 2.0.0  
**Estado**: 🟡 Funcional con pendientes menores (exportación en detalle)

---

## 📊 Resumen Ejecutivo

Tracking App usa Leaflet + OpenStreetMap, arquitectura modular (SRP + EventBus) y cubre el flujo completo de grabar, pausar/reanudar, guardar, reanudar recorridos pendientes y reproducir rutas guardadas.

### Métricas del Proyecto

| Métrica              | Valor                            |
| -------------------- | -------------------------------- |
| **Líneas de código** | ~2,000 LOC (JS)                  |
| **Archivos fuente**  | 15+ (core, ui, modelo, app)      |
| **Dependencias**     | Parcel 2.16, Vitest 4, happy-dom |
| **Tests**            | 152 tests ✅                     |
| **Bugs conocidos**   | 1 alta (export detalle)          |
| **Deuda técnica**    | Media-baja                       |

---

## ✅ Funcionalidades Completadas (v2.0)

### Core Features

| Feature                         | Estado | Ubicación principal                |
| ------------------------------- | ------ | ---------------------------------- |
| Tracking GPS en tiempo real     | ✅     | GeoLocationService.js              |
| Mapa interactivo (Leaflet)      | ✅     | MapService.js                      |
| Distancia/velocidad (Haversine) | ✅     | DistanceCalculator.js              |
| Persistencia LocalStorage       | ✅     | StorageService.js                  |
| Importación JSON                | ✅     | index.html                         |
| Exportación GPX/KML/Links/Share | ✅     | UIController.js / ExportService.js |
| Simulador GPS                   | ✅     | GeoSimulator.js                    |

### Funcionalidades destacadas

| Feature                              | Estado | Descripción                                   |
| ------------------------------------ | ------ | --------------------------------------------- |
| Pausar/Reanudar + tiempo acumulado   | ✅     | Control granular y timers en UIController     |
| Wake Lock + detección background     | ✅     | WakeLockService + listeners visibility        |
| Waypoints y marcadores diferenciales | ✅     | Inicio/fin/actual/usuario/waypoints           |
| Indicadores red/GPS/batería          | ✅     | HUD en track.html                             |
| Brújula y heading de movimiento      | ✅     | DeviceOrientation + cálculo de bearing        |
| Reanudar ruta pendiente              | ✅     | storage `tracking_pending_route`, resume=true |
| Reproducción de rutas guardadas      | ✅     | route-detail.html con replay e inversión      |

### Tests

Suite de **152 tests** con Vitest + happy-dom cubriendo servicios core (DistanceCalculator, EventBus, Route, StorageService, ExportService, GeoSimulator) y casos de error.

---

## 🔮 Roadmap

- [ ] Corregir exportación/compartir en `route-detail.html`
- [ ] PWA + cache de tiles/assets para uso offline
- [ ] Filtros/búsqueda en historial
- [ ] Selector de unidades (km/mi)
- [ ] Simplificación de polilíneas para rutas largas

---

## 📝 Changelog

### v2.0.0 (Febrero 27, 2026)

- 🎉 Migración completa a Leaflet + OpenStreetMap
- 🏗️ Arquitectura modular con EventBus
- ✨ Simulador GPS, marcadores diferenciados
- ✨ Wake Lock, brújula, indicadores de red/GPS/batería
- ✨ Pausar/Reanudar, rutas pendientes, notificaciones toast
- ✨ Exportación GPX/KML/links, replay en detalle
- 🧪 152 tests unitarios

### v1.0.0 (Original)

- Tracking GPS básico con HERE Maps
- Guardar/Exportar recorridos
- Dashboard de rutas
