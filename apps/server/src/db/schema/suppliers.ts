import { sql } from "drizzle-orm";
import {
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { products } from "./products";
import { uom } from "./uom";
import { timestamps, uuidPk } from "./utils";

export const suppliers = pgTable(
	"supplier",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		contactInfo: jsonb("contact_info").default(sql`'{}'::jsonb`).notNull(),
		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const supplierProducts = pgTable(
	"supplier_product",
	{
		id: uuidPk("id"),
		supplierId: uuid("supplier_id")
			.references(() => suppliers.id, { onDelete: "cascade" })
			.notNull(),
		productId: uuid("product_id")
			.references(() => products.id, { onDelete: "cascade" })
			.notNull(),
		supplierSku: text("supplier_sku"),
		defaultUom: text("default_uom").references(() => uom.code),
		leadTimeDays: integer("lead_time_days"),
		minOrderQty: numeric("min_order_qty", { precision: 28, scale: 9 }),
	},
	(t) => [unique().on(t.supplierId, t.productId)],
);
