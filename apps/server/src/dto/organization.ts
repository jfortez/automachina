import z from "zod";
import {
	FISCAL_PROVIDERS,
	LEGAL_ENTITY_TYPES,
	organizationAddressSchema,
	organizationCustomFieldsSchema,
	organizationFiscalConfigSchema,
	PAYMENT_TERMS,
	SUPPORTED_CURRENCIES,
	SUPPORTED_LANGUAGES,
	TAX_REGIONS,
} from "@/db/schema/organization";

export const addOrgMember = z.object({
	organizationId: z.uuid(),
	members: z.array(z.uuid()),
});

export const createOrganizationSettings = z.object({
	organizationId: z.string(),
	language: z.enum(SUPPORTED_LANGUAGES).default("es"),
	timezone: z.string().default("America/Guayaquil"),
	currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
	decimalPrecision: z.number().int().min(0).max(6).default(2),
	quantityPrecision: z.number().int().min(0).max(9).default(3),
	taxRegion: z.enum(TAX_REGIONS).default("GENERAL"),
	defaultTaxPercent: z.number().min(0).max(100).default(0),
	taxIncludedInPrice: z.boolean().default(false),
	fiscalProvider: z.enum(FISCAL_PROVIDERS).default("none"),
	fiscalProviderConfig: organizationFiscalConfigSchema.optional(),
	invoiceSequencePrefix: z.string().default("FAC"),
	autoGenerateInvoices: z.boolean().default(true),
	defaultPaymentTerms: z.enum(PAYMENT_TERMS).default("net_30"),
	autoApplyDiscounts: z.boolean().default(true),
	requireApprovalForDiscounts: z.boolean().default(false),
	maxDiscountPercent: z.number().min(0).max(100).default(0),
	requireApprovalForOrders: z.boolean().default(false),
	orderApprovalThreshold: z.number().optional(),
	maxCashDiscrepancy: z.number().default(10),
	customFields: organizationCustomFieldsSchema.optional(),

	// Institutional Data
	businessName: z.string().optional(),
	taxId: z.string().optional(),
	legalEntityType: z.enum(LEGAL_ENTITY_TYPES).optional(),
	isRequiredToKeepBooks: z.boolean().default(false),

	// Addresses
	mainAddress: organizationAddressSchema.optional(),
	branchAddress: organizationAddressSchema.optional(),

	// Branding
	logoUrl: z.url().optional(),
	faviconUrl: z.url().optional(),
	siteTitle: z.string().optional(),
	siteSubtitle: z.string().optional(),

	// Contact
	website: z.url().optional(),
	contactEmail: z.email().optional(),
});

export const createOrg = z.object({
	code: z.string().min(2).max(100),
	name: z.string().min(2).max(100),
	description: z.string().max(500).optional(),
	settings: createOrganizationSettings
		.omit({ organizationId: true })
		.optional(),
});

export const updateOrg = createOrg.omit({ code: true }).extend({
	id: z.uuid(),
});

export const updateOrganizationSettings = createOrganizationSettings
	.partial()
	.extend({
		id: z.string(),
	});

export const getOrganizationSettings = z.object({
	organizationId: z.string(),
});

export type AddOrgMemberInput = z.infer<typeof addOrgMember>;
export type CreateOrgInput = z.infer<typeof createOrg>;
export type CreateOrganizationSettingsInput = z.infer<
	typeof createOrganizationSettings
>;
export type GetOrganizationSettingsInput = z.infer<
	typeof getOrganizationSettings
>;
export type UpdateOrgInput = z.infer<typeof updateOrg>;
export type UpdateOrganizationSettingsInput = z.infer<
	typeof updateOrganizationSettings
>;
