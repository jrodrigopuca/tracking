/**
 * @fileoverview Tests for StorageService module
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = {
	store: {},
	getItem: vi.fn((key) => localStorageMock.store[key] || null),
	setItem: vi.fn((key, value) => {
		localStorageMock.store[key] = value;
	}),
	removeItem: vi.fn((key) => {
		delete localStorageMock.store[key];
	}),
	clear: vi.fn(() => {
		localStorageMock.store = {};
	}),
};
vi.stubGlobal("localStorage", localStorageMock);

// Mock EventBus
vi.mock("../core/EventBus.js", () => ({
	EventBus: {
		emit: vi.fn(),
	},
}));

import { StorageService } from "../core/StorageService.js";
import { EventBus } from "../core/EventBus.js";

describe("StorageService", () => {
	let storage;

	beforeEach(() => {
		localStorageMock.store = {};
		vi.clearAllMocks();
		storage = new StorageService("test_routes");
	});

	describe("constructor", () => {
		it("should use default storage key", () => {
			const defaultStorage = new StorageService();
			defaultStorage.save({ id: "1" });
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"tracking_routes",
				expect.any(String),
			);
		});

		it("should use custom storage key", () => {
			storage.save({ id: "1" });
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"test_routes",
				expect.any(String),
			);
		});
	});

	describe("getAll", () => {
		it("should return empty array when no routes", () => {
			const routes = storage.getAll();
			expect(routes).toEqual([]);
		});

		it("should return saved routes", () => {
			const routes = [{ id: "1", name: "Test" }];
			localStorageMock.store["test_routes"] = JSON.stringify(routes);

			const result = storage.getAll();

			expect(result).toEqual(routes);
		});

		it("should handle invalid JSON gracefully", () => {
			localStorageMock.store["test_routes"] = "invalid json";

			const result = storage.getAll();

			expect(result).toEqual([]);
		});
	});

	describe("save", () => {
		it("should save route to localStorage", () => {
			const route = { id: "1", name: "Test", points: [] };

			const result = storage.save(route);

			expect(result).toBe(true);
			expect(localStorageMock.setItem).toHaveBeenCalled();
		});

		it("should emit route:saved event", () => {
			const route = { id: "1", name: "Test" };

			storage.save(route);

			expect(EventBus.emit).toHaveBeenCalledWith("route:saved", route);
		});

		it("should append to existing routes", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([{ id: "1" }]);

			storage.save({ id: "2" });

			const saved = JSON.parse(localStorageMock.store["test_routes"]);
			expect(saved).toHaveLength(2);
		});
	});

	describe("getById", () => {
		it("should return route by id", () => {
			const routes = [
				{ id: "1", name: "First" },
				{ id: "2", name: "Second" },
			];
			localStorageMock.store["test_routes"] = JSON.stringify(routes);

			const result = storage.getById("2");

			expect(result.name).toBe("Second");
		});

		it("should return null if not found", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([]);

			const result = storage.getById("nonexistent");

			expect(result).toBeNull();
		});

		it("should handle string id comparison", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([{ id: 123 }]);

			const result = storage.getById("123");

			expect(result).not.toBeNull();
		});
	});

	describe("update", () => {
		it("should update existing route", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([
				{ id: "1", name: "Old Name" },
			]);

			const result = storage.update("1", { name: "New Name" });

			expect(result).toBe(true);
			const saved = JSON.parse(localStorageMock.store["test_routes"]);
			expect(saved[0].name).toBe("New Name");
		});

		it("should return false if route not found", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([]);

			const result = storage.update("nonexistent", { name: "Test" });

			expect(result).toBe(false);
		});

		it("should emit route:updated event", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([
				{ id: "1", name: "Test" },
			]);

			storage.update("1", { name: "Updated" });

			expect(EventBus.emit).toHaveBeenCalledWith(
				"route:updated",
				expect.objectContaining({
					id: "1",
					name: "Updated",
				}),
			);
		});
	});

	describe("delete", () => {
		it("should remove route by id", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([
				{ id: "1", name: "Keep" },
				{ id: "2", name: "Delete" },
			]);

			const result = storage.delete("2");

			expect(result).toBe(true);
			const saved = JSON.parse(localStorageMock.store["test_routes"]);
			expect(saved).toHaveLength(1);
			expect(saved[0].id).toBe("1");
		});

		it("should return false if route not found", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([]);

			const result = storage.delete("nonexistent");

			expect(result).toBe(false);
		});

		it("should emit route:deleted event", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([{ id: "1" }]);

			storage.delete("1");

			expect(EventBus.emit).toHaveBeenCalledWith("route:deleted", { id: "1" });
		});
	});

	describe("clear", () => {
		it("should remove all routes", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([{ id: "1" }]);

			const result = storage.clear();

			expect(result).toBe(true);
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("test_routes");
		});

		it("should emit routes:cleared event", () => {
			storage.clear();

			expect(EventBus.emit).toHaveBeenCalledWith("routes:cleared", {});
		});
	});

	describe("count", () => {
		it("should return number of routes", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([
				{ id: "1" },
				{ id: "2" },
			]);

			expect(storage.count()).toBe(2);
		});

		it("should return 0 for empty storage", () => {
			expect(storage.count()).toBe(0);
		});
	});

	describe("hasRoutes", () => {
		it("should return true when routes exist", () => {
			localStorageMock.store["test_routes"] = JSON.stringify([{ id: "1" }]);

			expect(storage.hasRoutes()).toBe(true);
		});

		it("should return false when no routes", () => {
			expect(storage.hasRoutes()).toBe(false);
		});
	});

	describe("importFromJson", () => {
		it("should import array of points", async () => {
			const points = [
				{ lat: 0, lng: 0 },
				{ lat: 1, lng: 1 },
			];
			const file = new Blob([JSON.stringify(points)], {
				type: "application/json",
			});

			const result = await storage.importFromJson(file);

			expect(result).toEqual(points);
		});

		it("should import object with points property", async () => {
			const data = { name: "Test", points: [{ lat: 0, lng: 0 }] };
			const file = new Blob([JSON.stringify(data)], {
				type: "application/json",
			});

			const result = await storage.importFromJson(file);

			expect(result).toEqual(data.points);
		});

		it("should reject invalid format", async () => {
			const file = new Blob([JSON.stringify({ invalid: true })], {
				type: "application/json",
			});

			await expect(storage.importFromJson(file)).rejects.toThrow(
				"Formato inválido",
			);
		});

		it("should reject invalid point structure", async () => {
			const points = [{ lat: "invalid", lng: 0 }];
			const file = new Blob([JSON.stringify(points)], {
				type: "application/json",
			});

			await expect(storage.importFromJson(file)).rejects.toThrow(
				"lat y lng numéricos",
			);
		});

		it("should reject invalid JSON", async () => {
			const file = new Blob(["not json"], { type: "application/json" });

			await expect(storage.importFromJson(file)).rejects.toThrow(
				"JSON inválido",
			);
		});

		it("should emit route:imported event", async () => {
			const points = [{ lat: 0, lng: 0 }];
			const file = new Blob([JSON.stringify(points)], {
				type: "application/json",
			});
			Object.defineProperty(file, "name", { value: "test.json" });

			await storage.importFromJson(file);

			expect(EventBus.emit).toHaveBeenCalledWith("route:imported", {
				points,
				source: "test.json",
			});
		});
	});
});
