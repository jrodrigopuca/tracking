/**
 * @fileoverview Tests para ExportService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExportService } from "../core/ExportService.js";

// Mock route data
const mockRoute = {
	id: "test-123",
	name: "Test Route",
	createdAt: "2024-01-15T10:00:00.000Z",
	points: [
		{ lat: -12.046374, lng: -77.042793, timestamp: 1705312800000 },
		{ lat: -12.047374, lng: -77.043793, timestamp: 1705312860000 },
		{ lat: -12.048374, lng: -77.044793, timestamp: 1705312920000 },
	],
};

describe("ExportService", () => {
	describe("toGPX", () => {
		it("should generate valid GPX XML", () => {
			const gpx = ExportService.toGPX(mockRoute);

			expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(gpx).toContain("<gpx");
			expect(gpx).toContain("<trk>");
			expect(gpx).toContain("<trkseg>");
			expect(gpx).toContain("<trkpt");
			expect(gpx).toContain('lat="-12.046374"');
			expect(gpx).toContain('lon="-77.042793"');
		});

		it("should include route name", () => {
			const gpx = ExportService.toGPX(mockRoute);

			expect(gpx).toContain("<name>Test Route</name>");
		});

		it("should include timestamps when available", () => {
			const gpx = ExportService.toGPX(mockRoute);

			expect(gpx).toContain("<time>");
			expect(gpx).toContain("2024-01-15");
		});

		it("should handle empty route name", () => {
			const route = { ...mockRoute, name: "" };
			const gpx = ExportService.toGPX(route);

			expect(gpx).toContain("<name>Recorrido</name>");
		});

		it("should escape XML special characters", () => {
			const route = { ...mockRoute, name: 'Test <Route> & "More"' };
			const gpx = ExportService.toGPX(route);

			expect(gpx).toContain("&lt;Route&gt;");
			expect(gpx).toContain("&amp;");
		});
	});

	describe("toKML", () => {
		it("should generate valid KML XML", () => {
			const kml = ExportService.toKML(mockRoute);

			expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(kml).toContain("<kml");
			expect(kml).toContain("<Document>");
			expect(kml).toContain("<Placemark>");
			expect(kml).toContain("<LineString>");
			expect(kml).toContain("<coordinates>");
		});

		it("should format coordinates as lng,lat,alt", () => {
			const kml = ExportService.toKML(mockRoute);

			// KML uses lng,lat,alt format
			expect(kml).toContain("-77.042793,-12.046374,0");
		});

		it("should include route name", () => {
			const kml = ExportService.toKML(mockRoute);

			expect(kml).toContain("<name>Test Route</name>");
		});

		it("should include style definition", () => {
			const kml = ExportService.toKML(mockRoute);

			expect(kml).toContain("<Style");
			expect(kml).toContain("<LineStyle>");
			expect(kml).toContain("<color>");
		});
	});

	describe("toGoogleMapsURL", () => {
		it("should generate valid Google Maps URL", () => {
			const url = ExportService.toGoogleMapsURL(mockRoute);

			expect(url).toContain("https://www.google.com/maps/dir/");
			expect(url).toContain("api=1");
			expect(url).toContain("origin=-12.046374,-77.042793");
			expect(url).toContain("destination=-12.048374,-77.044793");
			expect(url).toContain("travelmode=driving");
		});

		it("should include waypoints for routes with >2 points", () => {
			const url = ExportService.toGoogleMapsURL(mockRoute);

			expect(url).toContain("waypoints=");
		});

		it("should return empty string for empty route", () => {
			const route = { points: [] };
			const url = ExportService.toGoogleMapsURL(route);

			expect(url).toBe("");
		});

		it("should sample waypoints when there are too many", () => {
			const manyPoints = Array.from({ length: 100 }, (_, i) => ({
				lat: -12 - i * 0.001,
				lng: -77 - i * 0.001,
				timestamp: Date.now() + i * 1000,
			}));
			const route = { points: manyPoints };

			const url = ExportService.toGoogleMapsURL(route, 10);

			// Should have limited waypoints
			const waypointMatch = url.match(/waypoints=/);
			expect(waypointMatch).not.toBeNull();
		});
	});

	describe("toAppleMapsURL", () => {
		it("should generate valid Apple Maps URL", () => {
			const url = ExportService.toAppleMapsURL(mockRoute);

			expect(url).toContain("http://maps.apple.com/");
			expect(url).toContain("saddr=-12.046374,-77.042793");
			expect(url).toContain("daddr=-12.048374,-77.044793");
			expect(url).toContain("dirflg=d");
		});

		it("should return empty string for empty route", () => {
			const route = { points: [] };
			const url = ExportService.toAppleMapsURL(route);

			expect(url).toBe("");
		});
	});

	describe("downloadFile", () => {
		let createObjectURLMock;
		let revokeObjectURLMock;
		let appendChildMock;
		let removeChildMock;

		beforeEach(() => {
			// Mock URL methods
			createObjectURLMock = vi.fn(() => "blob:mock-url");
			revokeObjectURLMock = vi.fn();
			global.URL.createObjectURL = createObjectURLMock;
			global.URL.revokeObjectURL = revokeObjectURLMock;

			// Mock DOM methods
			appendChildMock = vi.fn();
			removeChildMock = vi.fn();
			document.body.appendChild = appendChildMock;
			document.body.removeChild = removeChildMock;
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should create and download file", () => {
			const clickMock = vi.fn();
			vi.spyOn(document, "createElement").mockReturnValue({
				href: "",
				download: "",
				click: clickMock,
			});

			ExportService.downloadFile("content", "test.txt", "text/plain");

			expect(createObjectURLMock).toHaveBeenCalled();
			expect(clickMock).toHaveBeenCalled();
			expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
		});
	});

	describe("downloadGPX", () => {
		beforeEach(() => {
			vi.spyOn(ExportService, "downloadFile").mockImplementation(() => {});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should call downloadFile with correct parameters", () => {
			ExportService.downloadGPX(mockRoute);

			expect(ExportService.downloadFile).toHaveBeenCalledWith(
				expect.stringContaining("<?xml"),
				expect.stringContaining(".gpx"),
				"application/gpx+xml",
			);
		});
	});

	describe("downloadKML", () => {
		beforeEach(() => {
			vi.spyOn(ExportService, "downloadFile").mockImplementation(() => {});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should call downloadFile with correct parameters", () => {
			ExportService.downloadKML(mockRoute);

			expect(ExportService.downloadFile).toHaveBeenCalledWith(
				expect.stringContaining("<?xml"),
				expect.stringContaining(".kml"),
				"application/vnd.google-earth.kml+xml",
			);
		});
	});

	describe("canShare", () => {
		it("should return true when share is available", () => {
			global.navigator.share = vi.fn();

			expect(ExportService.canShare()).toBe(true);
		});

		it("should return false when share is not available", () => {
			delete global.navigator.share;

			expect(ExportService.canShare()).toBe(false);
		});
	});

	describe("openInGoogleMaps", () => {
		let windowOpenMock;

		beforeEach(() => {
			windowOpenMock = vi.fn();
			global.window.open = windowOpenMock;
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should open Google Maps URL in new window", () => {
			ExportService.openInGoogleMaps(mockRoute);

			expect(windowOpenMock).toHaveBeenCalledWith(
				expect.stringContaining("google.com/maps"),
				"_blank",
			);
		});

		it("should not open window for empty route", () => {
			ExportService.openInGoogleMaps({ points: [] });

			expect(windowOpenMock).not.toHaveBeenCalled();
		});
	});

	describe("openInAppleMaps", () => {
		let windowOpenMock;

		beforeEach(() => {
			windowOpenMock = vi.fn();
			global.window.open = windowOpenMock;
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should open Apple Maps URL in new window", () => {
			ExportService.openInAppleMaps(mockRoute);

			expect(windowOpenMock).toHaveBeenCalledWith(
				expect.stringContaining("maps.apple.com"),
				"_blank",
			);
		});
	});
});
