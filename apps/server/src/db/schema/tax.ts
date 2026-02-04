import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { timestamps, uuidPk } from "./utils";

// Organization-level settings for taxes, discounts, and business rules
export const organizationSettings = pgTable("organization_settings", {
	id: uuidPk("id"),
	organizationId: text("organization_id")
		.references(() => organization.id, { onDelete: "cascade" })
		.notNull(),

	// Tax Settings
	taxRegion: text("tax_region").default("GENERAL"), // e.g., "ECUADOR", "USA", "EU"
	defaultTaxPercent: numeric("default_tax_percent", {
		precision: 6,
		scale: 2,
	}).default("0"), // Default IVA %
	taxIncludedInPrice: boolean("tax_included_in_price").default(false), // Whether prices include tax

	// Discount Settings
	autoApplyDiscounts: boolean("auto_apply_discounts").default(true),
	requireApprovalForDiscounts: boolean(
		"require_approval_for_discounts",
	).default(false),
	maxDiscountPercent: numeric("max_discount_percent", {
		precision: 6,
		scale: 2,
	}).default("0"),

	// Billing Settings
	defaultCurrency: text("default_currency").default("USD"),
	defaultPaymentTerms: text("default_payment_terms"),
	invoiceSequencePrefix: text("invoice_sequence_prefix"), // e.g., "INV-", "FACT-"
	autoGenerateInvoices: boolean("auto_generate_invoices").default(true), // Generate invoice when order fulfilled

	// Order Settings
	requireApprovalForOrders: boolean("require_approval_for_orders").default(
		false,
	),
	orderApprovalThreshold: numeric("order_approval_threshold", {
		precision: 18,
		scale: 2,
	}), // Amount threshold for approval

	// Custom configuration fields
	customFields: jsonb("custom_fields").default("{}"),

	...timestamps,
});

// Tax rules by region/organization
export const taxRule = pgTable("tax_rule", {
	id: uuidPk("id"),
	organizationId: text("organization_id")
		.references(() => organization.id, { onDelete: "cascade" })
		.notNull(),

	code: text("code").notNull(), // e.g., "IVA", "VAT", "SALES_TAX"
	name: text("name").notNull(), // Display name
	description: text("description"),

	region: text("region").default("GENERAL"), // Country/region code
	taxType: text("tax_type").notNull(), // "percentage", "fixed", "compound"
	taxPercent: numeric("tax_percent", { precision: 6, scale: 2 }).default("0"), // For percentage types
	fixedAmount: numeric("fixed_amount", { precision: 18, scale: 2 }), // For fixed tax amounts

	// Applicability rules
	appliesToProducts: jsonb("applies_to_products").default("[]"), // Product category IDs or product IDs
	appliesToCategories: jsonb("applies_to_categories").default("[]"), // Category IDs

	// Conditions for application
	minAmount: numeric("min_amount", { precision: 18, scale: 2 }), // Minimum amount to apply tax
	maxAmount: numeric("max_amount", { precision: 18, scale: 2 }), // Maximum amount to apply tax

	isActive: boolean("is_active").default(true).notNull(),
	isDefault: boolean("is_default").default(false), // Default tax for region

	...timestamps,
});

// Invoice sequence numbering
export const invoiceSequence = pgTable("invoice_sequence", {
	id: uuidPk("id"),
	organizationId: text("organization_id")
		.references(() => organization.id, { onDelete: "cascade" })
		.notNull(),

	year: integer("year").notNull(), // Calendar year
	month: integer("month").notNull(), // Month 1-12
	sequenceType: text("sequence_type").default("sales"), // "sales", "purchase"

	lastNumber: integer("last_number").default(0).notNull(),
	prefix: text("prefix"), // e.g., "INV-", "FACT-"
	resetType: text("reset_type").default("year"), // "year", "month", "never"

	...timestamps,
});
