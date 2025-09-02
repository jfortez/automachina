import { z } from "zod";
import { recordSchema } from "./shared";

const productImage = z.object({
	url: z.string(),
	altText: z.string().max(100).optional(),
	mime: z.string().optional(),
	width: z.number(),
	height: z.number(),
	metadata: recordSchema.optional(),
	isPrimary: z.boolean(),
	sortOrder: z.number().optional().default(0),
});

const productPrice = z.object({
	priceListId: z.string().optional(), // Link to priceList (e.g., 'public' or 'wholesale')
	customerId: z.string().optional(), // Customer-specific pricing
	uomCode: z.string().min(1),
	price: z.number().min(0),
	currency: z.string().default("USD"),
	minQty: z.number().positive().default(1),
	effectiveFrom: z.date().optional(),
	effectiveTo: z.date().optional(),
});

const productUom = z.object({
	uomCode: z.string(),
	qtyInBase: z.string().optional(),
	isBase: z.boolean().default(false).optional(),
});

const productIdentifier = z.object({
	type: z.string().min(1), // e.g., 'GTIN', 'EAN', 'UPC'
	value: z.string().min(1),
	uomCode: z.string().min(1).optional(), // Optional: Tie identifier to a specific UoM (e.g., package GTIN)
});

export const createProduct = z.object({
	organizationId: z.string(),
	sku: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	categoryId: z.string(),
	images: z.array(productImage).optional(),
	baseUom: z.string().min(1),
	trackingLevel: z
		.enum(["none", "lot", "serial", "lot+serial"])
		.default("none"),
	attributes: recordSchema.optional(), //FOR LLM/ Semantic Search eg. Store tags, labels, colors, weights, etc. as JSON (e.g., { tags: ["Plomeria", "Roscable"], sizeOptions: ["1/2", "3/4"] })
	perishable: z.boolean().default(false),
	shelfLifeDays: z.number().int().positive().optional(),
	productUoms: z.array(productUom).min(1),
	isPhysical: z.boolean().default(true),
	productFamilyId: z.string().optional(), // Link to family for variations (e.g., different sizes of the same product)
	suggestedRetailPrice: z.string().optional(), // Base suggested price (in base UoM)
	defaultCost: z.string().optional(),
	defaultCurrency: z.string().default("USD"),
	prices: z.array(productPrice).optional(),
	identifiers: z.array(productIdentifier).optional(), // For external IDs, useful for packages in CASE 2
});

export const createProductCategory = z.object({
	organizationId: z.string(),
	code: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

export const updateProductCategory = createProductCategory
	.extend({
		id: z.string(),
	})
	.partial({ organizationId: true, code: true, name: true });

export type CreateProductInput = z.infer<typeof createProduct>;
export type CreateProductCategoryInput = z.infer<typeof createProductCategory>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategory>;
