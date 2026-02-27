/**
 * @fileoverview Tests for Route model
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Route } from "../models/Route.js";

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
	randomUUID: () => "test-uuid-" + Math.random().toString(36).substr(2, 9),
});

describe("Route", () => {
	let route;

	beforeEach(() => {
		route = new Route("Test Route");
	});

	describe("constructor", () => {
		it("should create route with name", () => {
			expect(route.name).toBe("Test Route");
		});

		it("should generate unique id", () => {
			const route2 = new Route("Another");
			expect(route.id).not.toBe(route2.id);
		});

		it("should accept custom id", () => {
			const customRoute = new Route("Custom", "my-custom-id");
			expect(customRoute.id).toBe("my-custom-id");
		});

		it("should initialize with empty points array", () => {
			expect(route.points).toEqual([]);
		});

		it("should set createdAt timestamp", () => {
			expect(route.createdAt).toBeDefined();
			expect(new Date(route.createdAt)).toBeInstanceOf(Date);
		});

		it("should use default name when not provided", () => {
			const defaultRoute = new Route();
			expect(defaultRoute.name).toBe("Sin nombre");
		});
	});

	describe("addPoint", () => {
		it("should add point to route", () => {
			route.addPoint(40.7128, -74.006);

			expect(route.points).toHaveLength(1);
			expect(route.points[0]).toMatchObject({
				lat: 40.7128,
				lng: -74.006,
			});
		});

		it("should add timestamp to point", () => {
			route.addPoint(40.7128, -74.006);

			expect(route.points[0].timestamp).toBeDefined();
			expect(typeof route.points[0].timestamp).toBe("number");
		});

		it("should return the added point", () => {
			const point = route.addPoint(40.7128, -74.006);

			expect(point).toMatchObject({
				lat: 40.7128,
				lng: -74.006,
			});
		});

		it("should add multiple points", () => {
			route.addPoint(0, 0);
			route.addPoint(1, 1);
			route.addPoint(2, 2);

			expect(route.points).toHaveLength(3);
		});
	});

	describe("getLastPoint", () => {
		it("should return null for empty route", () => {
			expect(route.getLastPoint()).toBeNull();
		});

		it("should return last point", () => {
			route.addPoint(0, 0);
			route.addPoint(1, 1);

			const last = route.getLastPoint();
			expect(last.lat).toBe(1);
			expect(last.lng).toBe(1);
		});
	});

	describe("getPointCount", () => {
		it("should return 0 for empty route", () => {
			expect(route.getPointCount()).toBe(0);
		});

		it("should return correct count", () => {
			route.addPoint(0, 0);
			route.addPoint(1, 1);

			expect(route.getPointCount()).toBe(2);
		});
	});

	describe("getDistance", () => {
		it("should return 0 for empty route", () => {
			expect(route.getDistance()).toBe(0);
		});

		it("should return 0 for single point", () => {
			route.addPoint(0, 0);
			expect(route.getDistance()).toBe(0);
		});

		it("should calculate distance for route with points", () => {
			route.addPoint(0, 0);
			route.addPoint(0, 0.009);

			expect(route.getDistance()).toBeCloseTo(1, 0);
		});
	});

	describe("clear", () => {
		it("should remove all points", () => {
			route.addPoint(0, 0);
			route.addPoint(1, 1);

			route.clear();

			expect(route.points).toEqual([]);
		});
	});

	describe("toJSON", () => {
		it("should serialize route to JSON object", () => {
			route.addPoint(40.7128, -74.006);
			const json = route.toJSON();

			expect(json).toHaveProperty("id");
			expect(json).toHaveProperty("name", "Test Route");
			expect(json).toHaveProperty("points");
			expect(json).toHaveProperty("createdAt");
			expect(json).toHaveProperty("distance");
		});

		it("should include calculated distance", () => {
			route.addPoint(0, 0);
			route.addPoint(0, 0.009);

			const json = route.toJSON();
			expect(json.distance).toBeCloseTo(1, 0);
		});
	});

	describe("fromJSON", () => {
		it("should restore route from JSON", () => {
			route.addPoint(40.7128, -74.006);
			const json = route.toJSON();

			const restored = Route.fromJSON(json);

			expect(restored.name).toBe(route.name);
			expect(restored.id).toBe(route.id);
			expect(restored.points).toEqual(route.points);
		});

		it("should handle missing optional fields", () => {
			const json = { id: "test", points: [] };
			const restored = Route.fromJSON(json);

			expect(restored.name).toBe("Sin nombre");
			expect(restored.points).toEqual([]);
		});

		it("should throw for invalid data", () => {
			expect(() => Route.fromJSON(null)).toThrow();
			expect(() => Route.fromJSON("invalid")).toThrow();
		});
	});

	describe("isValid", () => {
		it("should return true for valid route data", () => {
			const data = {
				id: "test",
				name: "Test",
				points: [{ lat: 0, lng: 0 }],
			};
			expect(Route.isValid(data)).toBe(true);
		});

		it("should return false for invalid data", () => {
			expect(Route.isValid(null)).toBe(false);
			expect(Route.isValid({})).toBe(false);
			expect(Route.isValid({ points: "not array" })).toBe(false);
		});

		it("should return false for invalid points", () => {
			const data = {
				points: [{ lat: "invalid", lng: 0 }],
			};
			expect(Route.isValid(data)).toBe(false);
		});

		it("should return true for empty points array", () => {
			const data = { points: [] };
			expect(Route.isValid(data)).toBe(true);
		});
	});
});
