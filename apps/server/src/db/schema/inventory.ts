import { sql } from "drizzle-orm";
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { suppliers } from "./suppliers";
import { uuidPk } from "./utils";

export const batches = pgTable(
	"batch",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => products.id, { onDelete: "cascade" })
			.notNull(),
		supplierId: uuid("supplier_id").references(() => suppliers.id),
		code: text("code").notNull(), // número de lote
		mfgDate: timestamp("mfg_date", { withTimezone: true }),
		expDate: timestamp("exp_date", { withTimezone: true }),
		status: text("status").default("released").notNull(),
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
	},
	(t) => [unique().on(t.productId, t.supplierId, t.code)],
);

export const serialNumbers = pgTable("serial_number", {
	id: uuidPk("id"),
	productId: uuid("product_id")
		.references(() => products.id, { onDelete: "cascade" })
		.notNull(),
	batchId: uuid("batch_id").references(() => batches.id, {
		onDelete: "set null",
	}),
	serial: text("serial").notNull(),
	status: text("status").default("in_stock").notNull(), //'in_stock','shipped','scrapped','lost'
});
