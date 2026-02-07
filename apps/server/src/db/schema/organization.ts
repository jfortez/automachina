import { relations, sql } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { organization } from "./auth";
import { timestamps, uuidPk } from "./utils";

export const SUPPORTED_LANGUAGES = ["es", "en", "pt"] as const;

export const SUPPORTED_CURRENCIES = [
	"USD",
	"EUR",
	"PEN",
	"COP",
	"MXN",
] as const;

export const TAX_REGIONS = [
	"ECUADOR",
	"PERU",
	"COLOMBIA",
	"MEXICO",
	"USA",
	"GENERAL",
] as const;

export const FISCAL_PROVIDERS = [
	"none",
	"sri",
	"sunat",
	"dian",
	"sat",
] as const;

export const PAYMENT_TERMS = [
	"net_15",
	"net_30",
	"net_60",
	"due_on_receipt",
] as const;

export const organizationFiscalConfigSchema = z.object({
	environment: z.enum(["production", "testing"]).default("testing"),
	certificatePath: z.string().optional(),
	certificatePassword: z.string().optional(),
	apiKey: z.string().optional(),
	apiSecret: z.string().optional(),
	webhookUrl: z.string().optional(),
});

export type OrganizationFiscalConfig = z.infer<
	typeof organizationFiscalConfigSchema
>;

export const organizationCustomFieldsSchema = z
	.object({})
	.catchall(z.unknown())
	.default({});

export type OrganizationCustomFields = z.infer<
	typeof organizationCustomFieldsSchema
>;

export const organizationSettings = pgTable("organization_settings", {
	id: uuidPk("id"),
	organizationId: text("organization_id")
		.references(() => organization.id, { onDelete: "cascade" })
		.notNull()
		.unique(),
	language: text("language", { enum: SUPPORTED_LANGUAGES })
		.default("es")
		.notNull(),
	timezone: text("timezone").default("America/Guayaquil").notNull(),
	currency: text("currency", { enum: SUPPORTED_CURRENCIES })
		.default("USD")
		.notNull(),
	decimalPrecision: integer("decimal_precision").default(2).notNull(),
	quantityPrecision: integer("quantity_precision").default(3).notNull(),
	taxRegion: text("tax_region", { enum: TAX_REGIONS })
		.default("GENERAL")
		.notNull(),
	defaultTaxPercent: numeric("default_tax_percent", {
		precision: 6,
		scale: 2,
	}).default("0"),
	taxIncludedInPrice: boolean("tax_included_in_price").default(false),
	fiscalProvider: text("fiscal_provider", { enum: FISCAL_PROVIDERS })
		.default("none")
		.notNull(),
	fiscalProviderConfig: jsonb("fiscal_provider_config")
		.default(sql`'{}'::jsonb`)
		.$type<OrganizationFiscalConfig>(),
	invoiceSequencePrefix: text("invoice_sequence_prefix").default("FAC"),
	autoGenerateInvoices: boolean("auto_generate_invoices").default(true),
	defaultPaymentTerms: text("default_payment_terms", {
		enum: PAYMENT_TERMS,
	}).default("net_30"),
	autoApplyDiscounts: boolean("auto_apply_discounts").default(true),
	requireApprovalForDiscounts: boolean(
		"require_approval_for_discounts",
	).default(false),
	maxDiscountPercent: numeric("max_discount_percent", {
		precision: 6,
		scale: 2,
	}).default("0"),
	requireApprovalForOrders: boolean("require_approval_for_orders").default(
		false,
	),
	orderApprovalThreshold: numeric("order_approval_threshold", {
		precision: 18,
		scale: 2,
	}),
	maxCashDiscrepancy: numeric("max_cash_discrepancy", {
		precision: 18,
		scale: 2,
	}).default("10"),
	customFields: jsonb("custom_fields")
		.default(sql`'{}'::jsonb`)
		.$type<OrganizationCustomFields>(),
	...timestamps,
});

export const organizationSettingsRelations = relations(
	organizationSettings,
	({ one }) => ({
		organization: one(organization, {
			fields: [organizationSettings.organizationId],
			references: [organization.id],
		}),
	}),
);
