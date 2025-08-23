import { sql } from "drizzle-orm";
import {
	jsonb,
	numeric,
	pgTable,
	text,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { uuidPk } from "./utils";

export const warehouses = pgTable(
	"warehouse",
	{
		id: uuidPk("id"),

		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		address: jsonb("address").default(sql`'{}'::jsonb`).notNull(),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const locations = pgTable(
	"location",
	{
		id: uuidPk("id"),
		warehouseId: uuid("warehouse_id")
			.references(() => warehouses.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		type: text("type", {
			enum: [
				"storage",
				"staging_in",
				"staging_out",
				"qc_hold",
				"damaged",
				"returns",
			],
		}).notNull(),
		temperatureMin: numeric("temperature_c_min", { precision: 10, scale: 2 }),
		temperatureMax: numeric("temperature_c_max", { precision: 10, scale: 2 }),
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
	},
	(t) => [unique().on(t.warehouseId, t.code)],
);
