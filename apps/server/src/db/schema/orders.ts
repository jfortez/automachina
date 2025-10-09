import { relations } from "drizzle-orm";
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
import { warehouses } from "./warehouse";

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
		warehouseId: uuid("warehouse_id").references(() => warehouses.id), // Default receiving warehouse

		code: text("code").notNull(),
		status: text("status").default("open").notNull(), // "open", "ordered", "partially_received", "received", "cancelled"

		orderedAt: timestamp("ordered_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		expectedDeliveryDate: timestamp("expected_delivery_date", {
			withTimezone: true,
		}),

		// Additional metadata
		notes: text("notes"),
		referenceNumber: text("reference_number"), // External PO number

		// Status tracking
		fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }), // When fully received
		invoiceId: uuid("invoice_id"), // Reference to generated invoice
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
	notes: text("notes"),
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
		warehouseId: uuid("warehouse_id").references(() => warehouses.id), // Default shipping warehouse

		code: text("code").notNull(),
		status: text("status").default("open").notNull(), // "open", "processing", "fulfilled", "cancelled"

		orderedAt: timestamp("ordered_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }), // When fully fulfilled

		// Additional metadata
		notes: text("notes"),
		referenceNumber: text("reference_number"), // External reference

		// Status tracking
		invoiceId: uuid("invoice_id"), // Reference to generated invoice
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
	notes: text("notes"),
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

// Relations
export const purchaseOrdersRelations = relations(
	purchaseOrders,
	({ one, many }) => ({
		organization: one(organizations, {
			fields: [purchaseOrders.organizationId],
			references: [organizations.id],
		}),
		supplier: one(suppliers, {
			fields: [purchaseOrders.supplierId],
			references: [suppliers.id],
		}),
		warehouse: one(warehouses, {
			fields: [purchaseOrders.warehouseId],
			references: [warehouses.id],
		}),
		purchaseOrderLines: many(purchaseOrderLines),
	}),
);

export const purchaseOrderLinesRelations = relations(
	purchaseOrderLines,
	({ one }) => ({
		purchaseOrder: one(purchaseOrders, {
			fields: [purchaseOrderLines.purchaseOrderId],
			references: [purchaseOrders.id],
		}),
		product: one(product, {
			fields: [purchaseOrderLines.productId],
			references: [product.id],
		}),
		uom: one(uom, {
			fields: [purchaseOrderLines.uomCode],
			references: [uom.code],
		}),
	}),
);

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [salesOrders.organizationId],
		references: [organizations.id],
	}),
	customer: one(customers, {
		fields: [salesOrders.customerId],
		references: [customers.id],
	}),
	warehouse: one(warehouses, {
		fields: [salesOrders.warehouseId],
		references: [warehouses.id],
	}),
	salesOrderLines: many(salesOrderLines),
}));

export const salesOrderLinesRelations = relations(
	salesOrderLines,
	({ one, many }) => ({
		salesOrder: one(salesOrders, {
			fields: [salesOrderLines.salesOrderId],
			references: [salesOrders.id],
		}),
		product: one(product, {
			fields: [salesOrderLines.productId],
			references: [product.id],
		}),
		uom: one(uom, {
			fields: [salesOrderLines.uomCode],
			references: [uom.code],
		}),
		inventoryReservations: many(inventoryReservations),
	}),
);

export const inventoryReservationsRelations = relations(
	inventoryReservations,
	({ one }) => ({
		salesOrderLine: one(salesOrderLines, {
			fields: [inventoryReservations.salesOrderLineId],
			references: [salesOrderLines.id],
		}),
		product: one(product, {
			fields: [inventoryReservations.productId],
			references: [product.id],
		}),
		batch: one(batches, {
			fields: [inventoryReservations.batchId],
			references: [batches.id],
		}),
		handlingUnit: one(handlingUnits, {
			fields: [inventoryReservations.handlingUnitId],
			references: [handlingUnits.id],
		}),
	}),
);
