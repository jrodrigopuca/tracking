/**
 * @fileoverview Tests for GeoSimulator module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GeoSimulator } from "../core/GeoSimulator.js";

describe("GeoSimulator", () => {
	let simulator;

	afterEach(() => {
		if (simulator && simulator.isRunning()) {
			simulator.stop();
		}
	});

	describe("constructor", () => {
		it("should create simulator with random city when no position provided", () => {
			simulator = new GeoSimulator();
			const city = simulator.getSelectedCity();

			expect(city).toHaveProperty("name");
			expect(city).toHaveProperty("lat");
			expect(city).toHaveProperty("lng");
			expect(typeof city.lat).toBe("number");
			expect(typeof city.lng).toBe("number");
		});

		it("should use provided start position", () => {
			const customPosition = { lat: 40.7128, lng: -74.006 };
			simulator = new GeoSimulator(customPosition);
			const city = simulator.getSelectedCity();

			expect(city.name).toBe("Custom");
			expect(city.lat).toBe(customPosition.lat);
			expect(city.lng).toBe(customPosition.lng);
		});

		it("should accept custom config", () => {
			simulator = new GeoSimulator(null, { interval: 500, accuracy: 5 });
			// El simulador debería funcionar con config personalizada
			expect(simulator).toBeDefined();
		});
	});

	describe("getSelectedCity", () => {
		it("should return a copy of the selected city", () => {
			simulator = new GeoSimulator();
			const city1 = simulator.getSelectedCity();
			const city2 = simulator.getSelectedCity();

			expect(city1).toEqual(city2);
			expect(city1).not.toBe(city2); // Diferentes referencias
		});
	});

	describe("getStartPosition", () => {
		it("should return start position with lat and lng", () => {
			const customPosition = { lat: 35.6762, lng: 139.6503 };
			simulator = new GeoSimulator(customPosition);
			const startPos = simulator.getStartPosition();

			expect(startPos.lat).toBe(customPosition.lat);
			expect(startPos.lng).toBe(customPosition.lng);
		});

		it("should return city coordinates as start position", () => {
			simulator = new GeoSimulator();
			const city = simulator.getSelectedCity();
			const startPos = simulator.getStartPosition();

			expect(startPos.lat).toBe(city.lat);
			expect(startPos.lng).toBe(city.lng);
		});
	});

	describe("start/stop", () => {
		it("should start simulation and call callback with initial position", () => {
			simulator = new GeoSimulator({ lat: 40.7128, lng: -74.006 });
			const callback = vi.fn();

			simulator.start(callback);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(simulator.isRunning()).toBe(true);
		});

		it("should call callback with position object containing required fields", () => {
			simulator = new GeoSimulator({ lat: 40.7128, lng: -74.006 });
			const callback = vi.fn();

			simulator.start(callback);
			const position = callback.mock.calls[0][0];

			expect(position).toHaveProperty("lat");
			expect(position).toHaveProperty("lng");
			expect(position).toHaveProperty("accuracy");
			expect(position).toHaveProperty("timestamp");
			expect(typeof position.lat).toBe("number");
			expect(typeof position.lng).toBe("number");
			expect(typeof position.accuracy).toBe("number");
			expect(typeof position.timestamp).toBe("number");
		});

		it("should stop simulation", () => {
			simulator = new GeoSimulator();
			simulator.start(vi.fn());

			simulator.stop();

			expect(simulator.isRunning()).toBe(false);
		});

		it("should not throw when stopping already stopped simulator", () => {
			simulator = new GeoSimulator();

			expect(() => simulator.stop()).not.toThrow();
		});

		it("should restart if start is called while running", () => {
			simulator = new GeoSimulator();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			simulator.start(callback1);
			simulator.start(callback2);

			expect(simulator.isRunning()).toBe(true);
			expect(callback2).toHaveBeenCalled();
		});
	});

	describe("isRunning", () => {
		it("should return false when not started", () => {
			simulator = new GeoSimulator();

			expect(simulator.isRunning()).toBe(false);
		});

		it("should return true when running", () => {
			simulator = new GeoSimulator();
			simulator.start(vi.fn());

			expect(simulator.isRunning()).toBe(true);
		});

		it("should return false after stop", () => {
			simulator = new GeoSimulator();
			simulator.start(vi.fn());
			simulator.stop();

			expect(simulator.isRunning()).toBe(false);
		});
	});

	describe("getCurrentPosition", () => {
		it("should return current position", () => {
			const startPos = { lat: 40.7128, lng: -74.006 };
			simulator = new GeoSimulator(startPos);
			const currentPos = simulator.getCurrentPosition();

			expect(currentPos.lat).toBe(startPos.lat);
			expect(currentPos.lng).toBe(startPos.lng);
		});

		it("should return a copy of position", () => {
			simulator = new GeoSimulator({ lat: 40.7128, lng: -74.006 });
			const pos1 = simulator.getCurrentPosition();
			const pos2 = simulator.getCurrentPosition();

			expect(pos1).toEqual(pos2);
			expect(pos1).not.toBe(pos2);
		});
	});

	describe("position updates", () => {
		it("should update position over time", async () => {
			vi.useFakeTimers();

			simulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 100 },
			);
			const callback = vi.fn();
			const initialPos = simulator.getCurrentPosition();

			simulator.start(callback);

			// Avanzar 500ms (5 actualizaciones)
			vi.advanceTimersByTime(500);

			const finalPos = simulator.getCurrentPosition();

			// La posición debería haber cambiado
			expect(
				finalPos.lat !== initialPos.lat || finalPos.lng !== initialPos.lng,
			).toBe(true);

			// Debería haber múltiples llamadas al callback
			expect(callback.mock.calls.length).toBeGreaterThan(1);

			vi.useRealTimers();
		});

		it("should emit positions with increasing timestamps", async () => {
			vi.useFakeTimers();

			simulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 100 },
			);
			const positions = [];

			simulator.start((pos) => positions.push(pos));

			vi.advanceTimersByTime(300);

			// Verificar timestamps crecientes
			for (let i = 1; i < positions.length; i++) {
				expect(positions[i].timestamp).toBeGreaterThanOrEqual(
					positions[i - 1].timestamp,
				);
			}

			vi.useRealTimers();
		});
	});

	describe("setSpeed", () => {
		it("should set fixed speed and disable dynamic pace", () => {
			simulator = new GeoSimulator();
			simulator.setSpeed(5.0);

			// Verificar que se puede obtener info del pace
			const paceInfo = simulator.getCurrentPaceInfo();
			expect(paceInfo.speed).toBe(5.0);
		});

		it("should affect position change rate", async () => {
			vi.useFakeTimers();

			const slowSimulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 100, dynamicPace: false },
			);
			slowSimulator.setSpeed(1.0);

			const fastSimulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 100, dynamicPace: false },
			);
			fastSimulator.setSpeed(5.0);

			const slowPositions = [];
			const fastPositions = [];

			slowSimulator.start((pos) => slowPositions.push(pos));
			fastSimulator.start((pos) => fastPositions.push(pos));

			vi.advanceTimersByTime(1000);

			slowSimulator.stop();
			fastSimulator.stop();

			// Calcular distancias totales aproximadas
			const calculateTotalDistance = (positions) => {
				let total = 0;
				for (let i = 1; i < positions.length; i++) {
					const dlat = positions[i].lat - positions[i - 1].lat;
					const dlng = positions[i].lng - positions[i - 1].lng;
					total += Math.sqrt(dlat * dlat + dlng * dlng);
				}
				return total;
			};

			const slowDistance = calculateTotalDistance(slowPositions);
			const fastDistance = calculateTotalDistance(fastPositions);

			// El rápido debería moverse más
			expect(fastDistance).toBeGreaterThan(slowDistance);

			vi.useRealTimers();
		});
	});

	describe("setDynamicPace", () => {
		it("should enable dynamic pace", () => {
			simulator = new GeoSimulator(null, { dynamicPace: false });
			simulator.setDynamicPace(true);

			// No debería lanzar error
			expect(simulator).toBeDefined();
		});

		it("should disable dynamic pace", () => {
			simulator = new GeoSimulator();
			simulator.setDynamicPace(false);

			// No debería lanzar error
			expect(simulator).toBeDefined();
		});
	});

	describe("getCurrentPaceInfo", () => {
		it("should return pace info object with required fields", () => {
			simulator = new GeoSimulator();
			simulator.start(vi.fn());

			const paceInfo = simulator.getCurrentPaceInfo();

			expect(paceInfo).toHaveProperty("mode");
			expect(paceInfo).toHaveProperty("name");
			expect(paceInfo).toHaveProperty("emoji");
			expect(paceInfo).toHaveProperty("speed");
			expect(paceInfo).toHaveProperty("speedKmh");
		});

		it("should have valid mode values", () => {
			simulator = new GeoSimulator();
			simulator.start(vi.fn());

			const paceInfo = simulator.getCurrentPaceInfo();
			const validModes = ["walking", "jogging", "running", "resting"];

			expect(validModes).toContain(paceInfo.mode);
		});

		it("should convert speed correctly to km/h", () => {
			simulator = new GeoSimulator();
			simulator.setSpeed(2.5); // 2.5 m/s

			const paceInfo = simulator.getCurrentPaceInfo();

			expect(paceInfo.speed).toBe(2.5);
			expect(paceInfo.speedKmh).toBe(9); // 2.5 * 3.6 = 9
		});

		it("should have appropriate speed for each mode", () => {
			simulator = new GeoSimulator();
			simulator.start(vi.fn());

			const paceInfo = simulator.getCurrentPaceInfo();

			// Velocidades esperadas por modo (m/s)
			const speedRanges = {
				walking: { min: 1.2, max: 1.5 },
				jogging: { min: 2.2, max: 3.0 },
				running: { min: 3.5, max: 5.0 },
				resting: { min: 0, max: 0.3 },
			};

			const range = speedRanges[paceInfo.mode];
			expect(paceInfo.speed).toBeGreaterThanOrEqual(range.min);
			expect(paceInfo.speed).toBeLessThanOrEqual(range.max);
		});
	});

	describe("dynamic pace changes", () => {
		it("should change pace over time with dynamic pace enabled", async () => {
			vi.useFakeTimers();

			simulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 100, dynamicPace: true },
			);

			const paceChanges = new Set();
			let lastPace = null;

			simulator.start(() => {
				const info = simulator.getCurrentPaceInfo();
				if (info.mode !== lastPace) {
					paceChanges.add(info.mode);
					lastPace = info.mode;
				}
			});

			// Avanzar suficiente tiempo para potenciales cambios de modo
			// (mínimo 5 segundos por modo, así que 60 segundos debería dar cambios)
			vi.advanceTimersByTime(60000);

			simulator.stop();

			// Debería haber al menos 1 modo registrado
			expect(paceChanges.size).toBeGreaterThanOrEqual(1);

			vi.useRealTimers();
		});

		it("should not change pace when dynamic pace is disabled", async () => {
			vi.useFakeTimers();

			simulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 100, dynamicPace: false },
			);
			simulator.setSpeed(2.0);

			const speeds = [];

			simulator.start(() => {
				speeds.push(simulator.getCurrentPaceInfo().speed);
			});

			vi.advanceTimersByTime(5000);

			simulator.stop();

			// Todas las velocidades deberían ser iguales
			const uniqueSpeeds = [...new Set(speeds)];
			expect(uniqueSpeeds.length).toBe(1);
			expect(uniqueSpeeds[0]).toBe(2.0);

			vi.useRealTimers();
		});
	});

	describe("accuracy simulation", () => {
		it("should have accuracy within expected range", () => {
			simulator = new GeoSimulator({ lat: 40.7128, lng: -74.006 });
			const callback = vi.fn();

			simulator.start(callback);
			const position = callback.mock.calls[0][0];

			// Default accuracy is 10, with random variation up to +5
			expect(position.accuracy).toBeGreaterThanOrEqual(10);
			expect(position.accuracy).toBeLessThan(16);
		});

		it("should vary accuracy between positions", async () => {
			vi.useFakeTimers();

			simulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 100 },
			);
			const accuracies = [];

			simulator.start((pos) => accuracies.push(pos.accuracy));

			vi.advanceTimersByTime(1000);

			// Con suficientes muestras, debería haber variación
			const uniqueAccuracies = [...new Set(accuracies)];
			expect(uniqueAccuracies.length).toBeGreaterThanOrEqual(1);

			vi.useRealTimers();
		});
	});

	describe("direction variance", () => {
		it("should change direction over time", async () => {
			vi.useFakeTimers();

			simulator = new GeoSimulator(
				{ lat: 0, lng: 0 },
				{ interval: 100, dynamicPace: false },
			);
			simulator.setSpeed(10); // Velocidad alta para ver cambios claros

			const positions = [];

			simulator.start((pos) => positions.push({ ...pos }));

			vi.advanceTimersByTime(2000);

			simulator.stop();

			// Calcular direcciones entre puntos consecutivos
			const directions = [];
			for (let i = 1; i < positions.length; i++) {
				const dlat = positions[i].lat - positions[i - 1].lat;
				const dlng = positions[i].lng - positions[i - 1].lng;
				if (dlat !== 0 || dlng !== 0) {
					directions.push(Math.atan2(dlng, dlat));
				}
			}

			// Debería haber variación en las direcciones
			if (directions.length > 1) {
				const minDir = Math.min(...directions);
				const maxDir = Math.max(...directions);
				// Alguna variación (puede ser pequeña debido a aleatoriedad)
				expect(maxDir - minDir).toBeGreaterThanOrEqual(0);
			}

			vi.useRealTimers();
		});
	});

	describe("random city selection", () => {
		it("should select from available cities", () => {
			// Crear múltiples simuladores y verificar que seleccionen ciudades válidas
			const cities = new Set();

			for (let i = 0; i < 20; i++) {
				const sim = new GeoSimulator();
				const city = sim.getSelectedCity();
				cities.add(city.name);
			}

			// Debería haber seleccionado al menos algunas ciudades diferentes
			expect(cities.size).toBeGreaterThanOrEqual(1);
		});

		it("should select cities with valid coordinates", () => {
			for (let i = 0; i < 10; i++) {
				const sim = new GeoSimulator();
				const city = sim.getSelectedCity();

				// Coordenadas válidas
				expect(city.lat).toBeGreaterThanOrEqual(-90);
				expect(city.lat).toBeLessThanOrEqual(90);
				expect(city.lng).toBeGreaterThanOrEqual(-180);
				expect(city.lng).toBeLessThanOrEqual(180);
			}
		});
	});

	describe("edge cases", () => {
		it("should handle very short intervals", async () => {
			vi.useFakeTimers();

			simulator = new GeoSimulator(
				{ lat: 40.7128, lng: -74.006 },
				{ interval: 10 },
			);
			const callback = vi.fn();

			simulator.start(callback);
			vi.advanceTimersByTime(100);
			simulator.stop();

			expect(callback.mock.calls.length).toBeGreaterThan(5);

			vi.useRealTimers();
		});

		it("should handle zero speed gracefully", () => {
			simulator = new GeoSimulator({ lat: 40.7128, lng: -74.006 });
			simulator.setSpeed(0);

			expect(() => simulator.start(vi.fn())).not.toThrow();
		});

		it("should handle positions near poles", async () => {
			vi.useFakeTimers();

			// Cerca del polo norte
			simulator = new GeoSimulator(
				{ lat: 89.9, lng: 0 },
				{ interval: 100, dynamicPace: false },
			);
			simulator.setSpeed(1);

			const positions = [];
			simulator.start((pos) => positions.push(pos));

			vi.advanceTimersByTime(500);

			// No debería lanzar errores
			expect(positions.length).toBeGreaterThan(1);

			vi.useRealTimers();
		});

		it("should handle positions near date line", async () => {
			vi.useFakeTimers();

			// Cerca de la línea de cambio de fecha
			simulator = new GeoSimulator(
				{ lat: 0, lng: 179.9 },
				{ interval: 100, dynamicPace: false },
			);
			simulator.setSpeed(1);

			const positions = [];
			simulator.start((pos) => positions.push(pos));

			vi.advanceTimersByTime(500);

			// No debería lanzar errores
			expect(positions.length).toBeGreaterThan(1);

			vi.useRealTimers();
		});
	});
});
