import { sql } from "drizzle-orm";
import {
	bigint,
	bigserial,
	check,
	index,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { handlingUnits } from "./handlingUnits";
import { organizations } from "./organizations";
import { product } from "./products";
import { suppliers } from "./suppliers";
import { uom } from "./uom";
import { uuidPk } from "./utils";
import { locations, warehouses } from "./warehouse";

export const batches = pgTable(
	"batch",
	{
		id: uuidPk("id"),
		productId: uuid("product_id")
			.references(() => product.id, { onDelete: "cascade" })
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
		.references(() => product.id, { onDelete: "cascade" })
		.notNull(),
	batchId: uuid("batch_id").references(() => batches.id, {
		onDelete: "set null",
	}),
	serial: text("serial").notNull(),
	status: text("status").default("in_stock").notNull(), //'in_stock','shipped','scrapped','lost'
});

export const inventoryLedger = pgTable(
	"inventory_ledger",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		occurredAt: timestamp("occurred_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		movementType: text("movement_type").notNull(),
		// movementType: pgEnum("movement_type", [
		//   "receipt",
		//   "issue",
		//   "transfer_in",
		//   "transfer_out",
		//   "adjustment_pos",
		//   "adjustment_neg",
		//   "assembly_in",
		//   "assembly_out",
		//   "disassembly_in",
		//   "disassembly_out",
		//   "cycle_count",
		//   "correction",
		// ]),
		productId: uuid("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "restrict" }),
		warehouseId: uuid("warehouse_id").references(() => warehouses.id),
		locationId: uuid("location_id").references(() => locations.id),
		batchId: uuid("batch_id").references(() => batches.id),
		serialId: uuid("serial_id").references(() => serialNumbers.id),
		handlingUnitId: uuid("handling_unit_id").references(() => handlingUnits.id),
		qtyInBase: numeric("qty_in_base", { precision: 28, scale: 9 }).notNull(),
		uomCode: text("uom_code").references(() => uom.code),
		qtyInUom: numeric("qty_in_uom", { precision: 28, scale: 9 }),
		unitCost: numeric("unit_cost", { precision: 18, scale: 6 }),
		currency: text("currency").default("USD"),
		sourceDocType: text("source_doc_type"),
		sourceDocId: uuid("source_doc_id"),
		note: text("note"),
	},
	(t) => [
		index().on(t.organizationId, t.occurredAt),
		check("check_qty_in_base", sql`${t.qtyInBase} <> 0`),
		check(
			"check_movement_type",
			sql`(${t.movementType} IN ('receipt','issue','transfer_in','transfer_out','adjustment_pos','adjustment_neg','assembly_in','assembly_out','disassembly_in','disassembly_out','cycle_count','correction'))`,
		),
	],
);

export const costLayer = pgTable(
	"cost_layer",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		productId: uuid("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "restrict" }),
		batchId: uuid("batch_id").references(() => batches.id),
		receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
		qtyInBase: numeric("qty_in_base", { precision: 28, scale: 9 }).notNull(),
		unitCost: numeric("unit_cost", { precision: 18, scale: 6 }).notNull(),
		currency: text("currency").default("USD"),
		sourceLedgerId: bigint("source_ledger_id", { mode: "number" }).references(
			() => inventoryLedger.id,
			{ onDelete: "set null" },
		),
	},
	(t) => [
		index()
			.on(t.organizationId, t.productId, t.batchId)
			.where(sql`${t.qtyInBase} > 0`),
	],
);
