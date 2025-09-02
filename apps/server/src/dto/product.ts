import { z } from "zod";
import { id } from "zod/v4/locales";

const productImage = z.object({
	url: z.string(),
	altText: z.string().max(100).optional(),
	mime: z.string().optional(),
	width: z.number(),
	height: z.number(),
	metadata: z.object(),
	isPrimary: z.boolean(),
});

export const createProduct = z.object({
	organizationId: z.string(),
	sku: z.string(),
	name: z.string(),
	description: z.string().optional(),
	price: z.number().min(0),
	categoryId: z.string(),
	images: z.array(productImage).optional(),
	baseUom: z.string().max(10),
	trackingLevel: z.enum(["none", "lot", "serial", "lot+serial"]),
	attributes: z.record(z.string(), z.any()).optional(),
	productUoms: z.array(
		z.object({
			uomCode: z.string(),
			qtyInBase: z.string(),
		}),
	),
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
