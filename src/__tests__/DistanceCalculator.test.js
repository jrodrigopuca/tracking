/**
 * @fileoverview Tests for DistanceCalculator module
 */

import { describe, it, expect } from "vitest";
import { DistanceCalculator } from "../core/DistanceCalculator.js";

describe("DistanceCalculator", () => {
	describe("haversine", () => {
		it("should return 0 for same coordinates", () => {
			const distance = DistanceCalculator.haversine(
				40.7128,
				-74.006,
				40.7128,
				-74.006,
			);
			expect(distance).toBe(0);
		});

		it("should calculate distance between NYC and LA correctly", () => {
			// NYC to LA is approximately 3936 km
			const distance = DistanceCalculator.haversine(
				40.7128,
				-74.006, // NYC
				34.0522,
				-118.2437, // LA
			);
			// Allow 100km tolerance
			expect(distance).toBeGreaterThan(3800);
			expect(distance).toBeLessThan(4100);
		});

		it("should calculate short distance correctly", () => {
			// ~1km at equator (0.009 degrees ≈ 1km)
			const distance = DistanceCalculator.haversine(0, 0, 0, 0.009);
			expect(distance).toBeCloseTo(1, 0);
		});

		it("should be symmetrical", () => {
			const d1 = DistanceCalculator.haversine(0, 0, 10, 10);
			const d2 = DistanceCalculator.haversine(10, 10, 0, 0);
			expect(d1).toBeCloseTo(d2, 10);
		});

		it("should handle negative coordinates", () => {
			const distance = DistanceCalculator.haversine(
				-12.0464,
				-77.0428, // Lima
				-33.4489,
				-70.6693, // Santiago
			);
			expect(distance).toBeGreaterThan(2000);
			expect(distance).toBeLessThan(2500);
		});
	});

	describe("totalDistance", () => {
		it("should return 0 for empty array", () => {
			expect(DistanceCalculator.totalDistance([])).toBe(0);
		});

		it("should return 0 for single point", () => {
			const points = [{ lat: 0, lng: 0 }];
			expect(DistanceCalculator.totalDistance(points)).toBe(0);
		});

		it("should return 0 for non-array input", () => {
			expect(DistanceCalculator.totalDistance(null)).toBe(0);
			expect(DistanceCalculator.totalDistance(undefined)).toBe(0);
			expect(DistanceCalculator.totalDistance("not an array")).toBe(0);
		});

		it("should calculate total distance for two points", () => {
			const points = [
				{ lat: 0, lng: 0 },
				{ lat: 0, lng: 0.009 },
			];
			const distance = DistanceCalculator.totalDistance(points);
			expect(distance).toBeCloseTo(1, 0);
		});

		it("should calculate total distance for multiple points", () => {
			const points = [
				{ lat: 0, lng: 0 },
				{ lat: 0, lng: 0.009 }, // ~1km
				{ lat: 0, lng: 0.018 }, // ~1km more
			];
			const distance = DistanceCalculator.totalDistance(points);
			expect(distance).toBeCloseTo(2, 0);
		});

		it("should sum all segments correctly", () => {
			const points = [
				{ lat: 0, lng: 0 },
				{ lat: 0, lng: 0.009 },
				{ lat: 0, lng: 0.018 },
				{ lat: 0, lng: 0.027 },
			];
			const distance = DistanceCalculator.totalDistance(points);
			expect(distance).toBeCloseTo(3, 0);
		});
	});
});
