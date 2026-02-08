import { drizzle } from "drizzle-orm/node-postgres";
import env from "@/lib/env";
import { schema } from "./schema";

export const db = drizzle({
	connection: {
		host: env.DATABASE_HOST,
		port: env.DATABASE_PORT,
		user: env.DATABASE_USER,
		password: env.DATABASE_PASSWORD,
		database: env.DATABASE_NAME,
	},
	schema,
});
