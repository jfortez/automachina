import {
	type AnyPgColumn,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { batches } from "./inventory";
import { organizations } from "./organizations";
import { products } from "./products";
import { uom } from "./uom";
import { uuidPk } from "./utils";
import { locations, warehouses } from "./warehouse";

export const handlingUnits = pgTable("handling_unit", {
	id: uuidPk("id"),
	organizationId: uuid("organization_id")
		.references(() => organizations.id, { onDelete: "cascade" })
		.notNull(),
	parentId: uuid("parent_id").references((): AnyPgColumn => handlingUnits.id, {
		onDelete: "cascade",
	}),
	code: text("code"),
	uomCode: text("uom_code").references(() => uom.code),
	warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
		onDelete: "set null",
	}),
	locationId: uuid("location_id").references(() => locations.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const handlingUnitContents = pgTable("handling_unit_content", {
	id: uuidPk("id"),
	handlingUnitId: uuid("handling_unit_id")
		.references(() => handlingUnits.id, { onDelete: "cascade" })
		.notNull(),
	productId: uuid("product_id")
		.references(() => products.id, { onDelete: "cascade" })
		.notNull(),
	batchId: uuid("batch_id").references(() => batches.id, {
		onDelete: "set null",
	}),
	qtyInBase: numeric("qty_in_base", { precision: 28, scale: 9 }).notNull(),
});
