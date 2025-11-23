import {
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { customers } from "./customer";
import { product } from "./products";
import { suppliers } from "./suppliers";
import { uom } from "./uom";
import { timestamps, uuidPk } from "./utils";

// Invoice header - main invoice record
export const invoice = pgTable("invoice", {
	id: uuidPk("id"),
	organizationId: text("organization_id")
		.references(() => organization.id, { onDelete: "cascade" })
		.notNull(),

	// Reference to source order
	orderId: uuid("order_id").notNull(), // Sales or purchase order ID
	orderType: text("order_type").notNull(), // "sales", "purchase"

	// Invoice identification
	invoiceNumber: text("invoice_number").notNull(),
	invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull(),
	dueDate: timestamp("due_date", { withTimezone: true }), // Optional due date

	// Parties involved
	customerId: uuid("customer_id").references(() => customers.id), // For sales invoices
	supplierId: uuid("supplier_id").references(() => suppliers.id), // For purchase invoices

	// Status and workflow
	status: text("status").notNull().default("draft"), // "draft", "issued", "paid", "cancelled"

	// Financial totals (calculated)
	subtotal: numeric("subtotal", { precision: 18, scale: 2 }).notNull(), // Sum of all line totals before taxes/discounts
	totalDiscount: numeric("total_discount", { precision: 18, scale: 2 }).default(
		"0",
	), // Header-level discount
	totalTax: numeric("total_tax", { precision: 18, scale: 2 }).default("0"), // Total tax amount
	totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(), // Final amount (subtotal - totalDiscount + totalTax)

	// Currency and region
	currency: text("currency").notNull().default("USD"),
	taxRegion: text("tax_region"), // Tax calculation region (e.g., "ECUADOR", "USA")

	// Applied taxes and discounts (stored as JSON for audit trail)
	appliedTaxRules: jsonb("applied_tax_rules").default("[]"), // [{taxRuleId, taxName, taxPercent, taxableAmount, taxAmount}]
	appliedDiscounts: jsonb("applied_discounts").default("[]"), // [{discountRuleId (optional), discountName, discountType, discountValue, discountAmount}]

	// Additional information
	notes: text("notes"),
	terms: text("terms"), // Payment terms
	referenceNumber: text("reference_number"), // External reference

	// Metadata
	issuedAt: timestamp("issued_at", { withTimezone: true }), // When changed to "issued"
	paidAt: timestamp("paid_at", { withTimezone: true }), // When marked as paid
	cancelledAt: timestamp("cancelled_at", { withTimezone: true }), // When cancelled

	...timestamps,
});

// Invoice items - detail lines
export const invoiceItem = pgTable("invoice_item", {
	id: uuidPk("id"),
	invoiceId: uuid("invoice_id")
		.references(() => invoice.id, { onDelete: "cascade" })
		.notNull(),

	// Reference to original order line (optional for manual invoice items)
	orderLineId: uuid("order_line_id"), // sales_order_line or purchase_order_line ID

	// Product details
	productId: uuid("product_id")
		.references(() => product.id)
		.notNull(),
	description: text("description"), // Override product name if needed

	// Quantity and units
	qty: numeric("qty", { precision: 28, scale: 9 }).notNull(),
	uomCode: text("uom_code")
		.references(() => uom.code)
		.notNull(),

	// Pricing
	unitPrice: numeric("unit_price", { precision: 18, scale: 6 }).notNull(),
	currency: text("currency").notNull().default("USD"),

	// Calculated amounts
	lineTotal: numeric("line_total", { precision: 18, scale: 6 }).notNull(), // qty * unitPrice

	// Line-level taxes and discounts
	discountAmount: numeric("discount_amount", {
		precision: 18,
		scale: 6,
	}).default("0"), // Line-level discount
	discountPercent: numeric("discount_percent", { precision: 6, scale: 2 }), // Optional discount percentage
	taxAmount: numeric("tax_amount", { precision: 18, scale: 6 }).default("0"), // Line tax amount
	taxPercent: numeric("tax_percent", { precision: 6, scale: 2 }), // Tax percentage applied

	// Additional information
	notes: text("notes"),

	// Line number for display ordering
	lineNumber: integer("line_number"),

	...timestamps,
});
