import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig(() => ({
	plugins: [tsconfigPaths()],
	test: {
		clearMocks: true,
		globals: true,
		setupFiles: ["dotenv/config"],
		exclude: ["dist", "node_modules"],
	},
}));
