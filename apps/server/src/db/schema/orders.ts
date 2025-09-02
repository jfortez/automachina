import {
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customer";
import { handlingUnits } from "./handlingUnits";
import { batches } from "./inventory";
import { organizations } from "./organizations";
import { product } from "./products";
import { suppliers } from "./suppliers";
import { uom } from "./uom";
import { uuidPk } from "./utils";

// Purchase Orders
export const purchaseOrders = pgTable(
	"purchase_order",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id)
			.notNull(),
		supplierId: uuid("supplier_id")
			.references(() => suppliers.id)
			.notNull(),
		code: text("code").notNull(),
		status: text("status").default("open").notNull(),
		orderedAt: timestamp("ordered_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const purchaseOrderLines = pgTable("purchase_order_line", {
	id: uuidPk("id"),
	purchaseOrderId: uuid("purchase_order_id")
		.references(() => purchaseOrders.id)
		.notNull(),
	productId: uuid("product_id")
		.references(() => product.id)
		.notNull(),
	uomCode: text("uom_code")
		.references(() => uom.code)
		.notNull(),
	qtyOrdered: numeric("qty_ordered", { precision: 28, scale: 9 }).notNull(),
	pricePerUom: numeric("price_per_uom", { precision: 18, scale: 6 }),
	currency: text("currency").default("USD"),
});

export const salesOrders = pgTable(
	"sales_order",
	{
		id: uuidPk("id"),
		organizationId: uuid("organization_id")
			.references(() => organizations.id)
			.notNull(),
		customerId: uuid("customer_id")
			.references(() => customers.id)
			.notNull(),
		code: text("code").notNull(),
		status: text("status").default("open").notNull(),
		orderedAt: timestamp("ordered_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);

export const salesOrderLines = pgTable("sales_order_line", {
	id: uuidPk("id"),
	salesOrderId: uuid("sales_order_id")
		.references(() => salesOrders.id)
		.notNull(),
	productId: uuid("product_id")
		.references(() => product.id)
		.notNull(),
	uomCode: text("uom_code")
		.references(() => uom.code)
		.notNull(),
	qtyOrdered: numeric("qty_ordered", { precision: 28, scale: 9 }).notNull(),
	pricePerUom: numeric("price_per_uom", { precision: 18, scale: 6 }),
	currency: text("currency").default("USD"),
});

export const inventoryReservations = pgTable("inventory_reservation", {
	id: uuidPk("id"),
	organizationId: uuid("organization_id")
		.references(() => organizations.id)
		.notNull(),
	salesOrderLineId: uuid("sales_order_line_id").references(
		() => salesOrderLines.id,
	),
	productId: uuid("product_id")
		.references(() => product.id)
		.notNull(),
	batchId: uuid("batch_id").references(() => batches.id),
	handlingUnitId: uuid("handling_unit_id").references(() => handlingUnits.id),
	qtyInBase: numeric("qty_in_base", { precision: 28, scale: 9 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
