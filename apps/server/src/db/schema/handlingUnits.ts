import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	index,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { batches } from "./inventory";
import { product } from "./products";
import { uom } from "./uom";
import { uuidPk } from "./utils";
import { locations, warehouses } from "./warehouse";

export const handlingUnits = pgTable(
	"handling_unit",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		parentId: uuid("parent_id").references(
			(): AnyPgColumn => handlingUnits.id,
			{
				onDelete: "cascade",
			},
		),
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
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const handlingUnitContents = pgTable(
	"handling_unit_content",
	{
		id: uuidPk("id"),
		handlingUnitId: uuid("handling_unit_id")
			.references(() => handlingUnits.id, { onDelete: "cascade" })
			.notNull(),
		productId: uuid("product_id")
			.references(() => product.id, { onDelete: "cascade" })
			.notNull(),
		batchId: uuid("batch_id").references(() => batches.id, {
			onDelete: "set null",
		}),
		uomCode: text("uom_code").references(() => uom.code),
		qtyInBase: numeric("qty_in_base", { precision: 28, scale: 9 }).notNull(),
		qtyInUom: numeric("qty_in_uom", { precision: 28, scale: 9 }).notNull(),
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
	},
	(t) => [
		check("check_qty_in_base", sql`${t.qtyInBase} > 0`),
		index().on(t.productId, t.handlingUnitId),
	],
);
// qtyInBase = qtyInUom * productUom.qtyInBase
