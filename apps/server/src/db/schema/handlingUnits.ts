import { relations, sql } from "drizzle-orm";
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

export const handlingUnitTypes = [
	"pallet",
	"box",
	"carton",
	"container",
	"bin",
] as const;

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
		type: text("type", { enum: handlingUnitTypes }),
		uomCode: text("uom_code").references(() => uom.code),
		warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
			onDelete: "set null",
		}),
		locationId: uuid("location_id").references(() => locations.id, {
			onDelete: "set null",
		}),
		capacity: numeric("capacity", { precision: 18, scale: 6 }),
		weightLimit: numeric("weight_limit", { precision: 18, scale: 6 }),
		dimensions: jsonb("dimensions"),
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
		batchId: text("batch_id"),
		uomCode: text("uom_code").references(() => uom.code),
		qtyInBase: numeric("qty_in_base", { precision: 28, scale: 9 }).notNull(),
		qtyInUom: numeric("qty_in_uom", { precision: 28, scale: 9 }).notNull(),
		serialNumber: text("serial_number"),
		attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
	},
	(t) => [
		check("check_qty_in_base", sql`${t.qtyInBase} > 0`),
		index().on(t.productId, t.handlingUnitId),
	],
);
// qtyInBase = qtyInUom * productUom.qtyInBase

export const handlingUnitHistory = pgTable(
	"handling_unit_history",
	{
		id: uuidPk("id"),
		handlingUnitId: uuid("handling_unit_id")
			.references(() => handlingUnits.id, { onDelete: "cascade" })
			.notNull(),
		fromLocationId: uuid("from_location_id").references(() => locations.id),
		toLocationId: uuid("to_location_id")
			.references(() => locations.id)
			.notNull(),
		movedBy: text("moved_by"),
		movedAt: timestamp("moved_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		notes: text("notes"),
	},
	(t) => [index().on(t.handlingUnitId, t.movedAt)],
);

// Relations
export const handlingUnitsRelations = relations(
	handlingUnits,
	({ one, many }) => ({
		organization: one(organization, {
			fields: [handlingUnits.organizationId],
			references: [organization.id],
		}),
		parent: one(handlingUnits, {
			fields: [handlingUnits.parentId],
			references: [handlingUnits.id],
		}),
		contents: many(handlingUnitContents),
		history: many(handlingUnitHistory),
		warehouse: one(warehouses, {
			fields: [handlingUnits.warehouseId],
			references: [warehouses.id],
		}),
		location: one(locations, {
			fields: [handlingUnits.locationId],
			references: [locations.id],
		}),
		uom: one(uom, {
			fields: [handlingUnits.uomCode],
			references: [uom.code],
		}),
	}),
);

export const handlingUnitContentsRelations = relations(
	handlingUnitContents,
	({ one }) => ({
		handlingUnit: one(handlingUnits, {
			fields: [handlingUnitContents.handlingUnitId],
			references: [handlingUnits.id],
		}),
		product: one(product, {
			fields: [handlingUnitContents.productId],
			references: [product.id],
		}),
		uom: one(uom, {
			fields: [handlingUnitContents.uomCode],
			references: [uom.code],
		}),
	}),
);

export const handlingUnitHistoryRelations = relations(
	handlingUnitHistory,
	({ one }) => ({
		handlingUnit: one(handlingUnits, {
			fields: [handlingUnitHistory.handlingUnitId],
			references: [handlingUnits.id],
		}),
		fromLocation: one(locations, {
			fields: [handlingUnitHistory.fromLocationId],
			references: [locations.id],
		}),
		toLocation: one(locations, {
			fields: [handlingUnitHistory.toLocationId],
			references: [locations.id],
		}),
	}),
);
