/**
 * @fileoverview Tests for EventBus module
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventBus } from "../core/EventBus.js";

describe("EventBus", () => {
	beforeEach(() => {
		EventBus.clear();
	});

	describe("on/emit", () => {
		it("should call subscriber when event is emitted", () => {
			const callback = vi.fn();
			EventBus.on("test", callback);

			EventBus.emit("test", { data: "hello" });

			expect(callback).toHaveBeenCalledWith({ data: "hello" });
		});

		it("should call multiple subscribers", () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			EventBus.on("test", callback1);
			EventBus.on("test", callback2);

			EventBus.emit("test");

			expect(callback1).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});

		it("should not throw when emitting event with no subscribers", () => {
			expect(() => EventBus.emit("nonexistent")).not.toThrow();
		});

		it("should return unsubscribe function", () => {
			const callback = vi.fn();
			const unsubscribe = EventBus.on("test", callback);

			unsubscribe();
			EventBus.emit("test");

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe("off", () => {
		it("should unsubscribe callback", () => {
			const callback = vi.fn();
			EventBus.on("test", callback);
			EventBus.off("test", callback);

			EventBus.emit("test");

			expect(callback).not.toHaveBeenCalled();
		});

		it("should not throw when removing from non-existent event", () => {
			expect(() => EventBus.off("nonexistent", () => {})).not.toThrow();
		});
	});

	describe("once", () => {
		it("should call callback only once", () => {
			const callback = vi.fn();
			EventBus.once("test", callback);

			EventBus.emit("test");
			EventBus.emit("test");

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("should pass data to callback", () => {
			const callback = vi.fn();
			EventBus.once("test", callback);

			EventBus.emit("test", { value: 42 });

			expect(callback).toHaveBeenCalledWith({ value: 42 });
		});
	});

	describe("has", () => {
		it("should return true when event has subscribers", () => {
			EventBus.on("test", () => {});
			expect(EventBus.has("test")).toBe(true);
		});

		it("should return false when event has no subscribers", () => {
			expect(EventBus.has("nonexistent")).toBeFalsy();
		});
	});

	describe("listenerCount", () => {
		it("should return correct count", () => {
			EventBus.on("test", () => {});
			EventBus.on("test", () => {});

			expect(EventBus.listenerCount("test")).toBe(2);
		});

		it("should return 0 for non-existent event", () => {
			expect(EventBus.listenerCount("nonexistent")).toBe(0);
		});
	});

	describe("clear", () => {
		it("should clear specific event", () => {
			EventBus.on("test1", () => {});
			EventBus.on("test2", () => {});

			EventBus.clear("test1");

			expect(EventBus.has("test1")).toBeFalsy();
			expect(EventBus.has("test2")).toBe(true);
		});

		it("should clear all events when no argument", () => {
			EventBus.on("test1", () => {});
			EventBus.on("test2", () => {});

			EventBus.clear();

			expect(EventBus.getEvents()).toEqual([]);
		});
	});

	describe("getEvents", () => {
		it("should return list of registered events", () => {
			EventBus.on("event1", () => {});
			EventBus.on("event2", () => {});

			const events = EventBus.getEvents();

			expect(events).toContain("event1");
			expect(events).toContain("event2");
		});
	});

	describe("error handling", () => {
		it("should catch errors in callbacks and continue", () => {
			const errorCallback = vi.fn(() => {
				throw new Error("Test error");
			});
			const normalCallback = vi.fn();

			EventBus.on("test", errorCallback);
			EventBus.on("test", normalCallback);

			// Should not throw
			expect(() => EventBus.emit("test")).not.toThrow();

			// Second callback should still be called
			expect(normalCallback).toHaveBeenCalled();
		});
	});
});
