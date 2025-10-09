import { z } from "zod";

// Invoice Item DTO
const invoiceItemSchema = z.object({
	orderLineId: z.string().optional(), // Reference to original order line
	productId: z.string(),
	description: z.string().optional(), // Can override product name
	qty: z.number().positive(),
	uomCode: z.string().min(1),
	unitPrice: z.number().min(0),
	currency: z.string().default("USD"),
	lineTotal: z.number().min(0), // qty * unitPrice before discounts/taxes
	discountAmount: z.number().min(0).default(0), // Line-level discount
	discountPercent: z.number().min(0).max(100).optional(),
	taxAmount: z.number().min(0).default(0), // Line tax amount
	taxPercent: z.number().min(0).max(100).optional(),
	notes: z.string().optional(),
});

// Invoice DTOs
export const createInvoiceSchema = z.object({
	organizationId: z.string(),
	orderId: z.string(), // Sales order or purchase order ID
	orderType: z.enum(["sales", "purchase"]),
	invoiceNumber: z.string().optional(), // Auto-generated if not provided
	invoiceDate: z.date().default(() => new Date()),
	dueDate: z.date().optional(),
	customerId: z.string().optional(), // For sales invoices
	supplierId: z.string().optional(), // For purchase invoices
	status: z.enum(["draft", "issued", "paid", "cancelled"]).default("draft"),

	// Financial totals (will be auto-calculated)
	subtotal: z.number().min(0), // Sum of all line totals
	totalDiscount: z.number().min(0).default(0), // Header-level discount
	discountPercent: z.number().min(0).max(100).optional(),
	totalTax: z.number().min(0).default(0), // Sum of all line taxes
	totalAmount: z.number().min(0), // subtotal - totalDiscount + totalTax

	currency: z.string().default("USD"),
	taxRegion: z.string().optional(), // For tax calculations (e.g., "ECUADOR", "USA")
	appliedTaxRules: z
		.array(
			z.object({
				taxRuleId: z.string(),
				taxName: z.string(),
				taxPercent: z.number(),
				taxableAmount: z.number(),
				taxAmount: z.number(),
			}),
		)
		.optional(),

	appliedDiscounts: z
		.array(
			z.object({
				discountRuleId: z.string().optional(),
				discountName: z.string(),
				discountType: z.enum(["percentage", "fixed"]),
				discountValue: z.number(),
				discountAmount: z.number(),
			}),
		)
		.optional(),

	items: z.array(invoiceItemSchema).min(1),

	notes: z.string().optional(),
	terms: z.string().optional(), // Payment terms
	referenceNumber: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
	id: z.string(),
	status: z.enum(["draft", "issued", "paid", "cancelled"]).optional(),
	dueDate: z.date().optional(),
	invoiceDate: z.date().optional(),
	notes: z.string().optional(),
	terms: z.string().optional(),
	referenceNumber: z.string().optional(),
});

// Invoice generation from order
export const generateInvoiceFromOrderSchema = z.object({
	orderId: z.string(),
	orderType: z.enum(["sales", "purchase"]),
	invoiceDate: z.date().optional(),
	dueDate: z.date().optional(),
	overridePrices: z.boolean().default(false), // Allow price overrides during generation
	applyDiscounts: z.boolean().default(true), // Apply automatic discounts
	includeTaxes: z.boolean().default(true), // Include taxes in calculation
	notes: z.string().optional(),
});

// Query DTOs
export const listInvoicesSchema = z.object({
	organizationId: z.string(),
	status: z.enum(["draft", "issued", "paid", "cancelled"]).optional(),
	orderType: z.enum(["sales", "purchase"]).optional(),
	customerId: z.string().optional(),
	supplierId: z.string().optional(),
	dateFrom: z.date().optional(),
	dateTo: z.date().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

export const getInvoiceByIdSchema = z.object({
	id: z.string(),
});

export const deleteInvoiceSchema = z.object({
	id: z.string(),
});

export const markInvoiceAsPaidSchema = z.object({
	id: z.string(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type GenerateInvoiceFromOrderInput = z.infer<
	typeof generateInvoiceFromOrderSchema
>;
export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;
export type GetInvoiceByIdInput = z.infer<typeof getInvoiceByIdSchema>;
export type DeleteInvoiceInput = z.infer<typeof deleteInvoiceSchema>;
export type MarkInvoiceAsPaidInput = z.infer<typeof markInvoiceAsPaidSchema>;
