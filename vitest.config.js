import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
		include: ["src/__tests__/**/*.test.js"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			exclude: ["node_modules/", "src/__tests__/", "*.config.js"],
		},
		globals: true,
	},
});
