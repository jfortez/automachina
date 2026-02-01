import { z } from "zod";

const invoiceItemSchema = z.object({
	orderLineId: z.string().optional(),
	productId: z.string(),
	description: z.string().optional(),
	qty: z.number().positive(),
	uomCode: z.string().min(1),
	unitPrice: z.number().min(0),
	currency: z.string().default("USD"),
	lineTotal: z.number().min(0),
	discountAmount: z.number().min(0).default(0),
	discountPercent: z.number().min(0).max(100).optional(),
	taxAmount: z.number().min(0).default(0),
	taxPercent: z.number().min(0).max(100).optional(),
	notes: z.string().optional(),
});

export const createInvoiceSchema = z.object({
	orderId: z.string(),
	orderType: z.enum(["sales", "purchase"]),
	invoiceNumber: z.string().optional(),
	invoiceDate: z.date().default(() => new Date()),
	dueDate: z.date().optional(),
	customerId: z.string().optional(),
	supplierId: z.string().optional(),
	status: z.enum(["draft", "issued", "paid", "cancelled"]).default("draft"),
	subtotal: z.number().min(0),
	totalDiscount: z.number().min(0).default(0),
	discountPercent: z.number().min(0).max(100).optional(),
	totalTax: z.number().min(0).default(0),
	totalAmount: z.number().min(0),
	currency: z.string().default("USD"),
	taxRegion: z.string().optional(),
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
	terms: z.string().optional(),
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

export const generateInvoiceFromOrderSchema = z.object({
	orderId: z.string(),
	orderType: z.enum(["sales", "purchase"]),
	invoiceDate: z.date().optional(),
	dueDate: z.date().optional(),
	overridePrices: z.boolean().default(false),
	applyDiscounts: z.boolean().default(true),
	includeTaxes: z.boolean().default(true),
	notes: z.string().optional(),
});

export const listInvoicesSchema = z.object({
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
