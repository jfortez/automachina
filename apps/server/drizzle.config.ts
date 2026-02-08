import { defineConfig } from "drizzle-kit";

import { credentials } from "@/lib/db";

export default defineConfig({
	schema: "./src/db/schema",
	out: "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: credentials,
});
