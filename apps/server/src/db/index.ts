import { drizzle } from "drizzle-orm/node-postgres";
import env from "@/lib/env";
import { schema } from "./schema";

export const db = drizzle({
	connection: env.DATABASE_URL || "",
	schema,
});
