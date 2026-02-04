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
	priceListId: z.string().optional(),
	customerId: z.string().optional(),
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
	type: z.string().min(1),
	value: z.string().min(1),
	uomCode: z.string().min(1).optional(),
});

export const createProduct = z.object({
	sku: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	categoryId: z.string(),
	images: z.array(productImage).optional(),
	baseUom: z.string().min(1),
	trackingLevel: z
		.enum(["none", "lot", "serial", "lot+serial"])
		.default("none"),
	attributes: recordSchema.optional(),
	perishable: z.boolean().default(false),
	shelfLifeDays: z.number().int().positive().optional(),
	productUoms: z.array(productUom).optional(),
	isPhysical: z.boolean().default(true),
	productFamilyId: z.string().optional(),
	suggestedRetailPrice: z.string().optional(),
	defaultCost: z.string().optional(),
	defaultCurrency: z.string().default("USD"),
	prices: z.array(productPrice).optional(),
	identifiers: z.array(productIdentifier).optional(),
	weight: z.number().min(0).optional(),
	weightUom: z.string().optional(),
});

export const createProductCategory = z.object({
	code: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

export const updateProductCategory = createProductCategory
	.extend({
		id: z.string(),
	})
	.partial({ code: true, name: true });

export const getProductStockSchema = z.object({
	productId: z.string(),
	warehouseId: z.string().optional(),
	uomCode: z.string().min(1).optional(),
});

export type GetProductStockInput = z.infer<typeof getProductStockSchema>;

export type CreateProductInput = z.infer<typeof createProduct>;
export type CreateProductCategoryInput = z.infer<typeof createProductCategory>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategory>;
