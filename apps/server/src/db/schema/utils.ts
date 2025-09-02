import { sql } from "drizzle-orm";
import { customType, timestamp, uuid } from "drizzle-orm/pg-core";

// Helper para UUID v7 (ordenable cronológicamente)
// Si prefieres v4, cambia a: default: sql`gen_random_uuid()`
export const uuidPk = (name: string) =>
	uuid(name).default(sql`gen_random_uuid()`).primaryKey();

export const timestamps = {
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
};

export const qty = customType<{
	data: string;
}>({
	dataType() {
		return "qty"; // <-- usamos el dominio creado
	},
});
