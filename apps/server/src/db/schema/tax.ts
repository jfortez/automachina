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
