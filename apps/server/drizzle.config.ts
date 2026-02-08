import { defineConfig } from "drizzle-kit";
import env from "@/lib/env";

export default defineConfig({
	schema: "./src/db/schema",
	out: "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		port: env.DATABASE_PORT,
		user: env.DATABASE_USER,
		password: env.DATABASE_PASSWORD,
	},
});
