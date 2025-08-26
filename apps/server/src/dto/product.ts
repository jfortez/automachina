import { z } from "zod";

export const createProduct = z.object({
	organizationId: z.string(),
	sku: z.string(),
	name: z.string(),
	description: z.string().optional(),
	price: z.number().min(0),
	categoryId: z.string(),
	images: z.array(z.string()).optional(),
	baseUom: z.string().max(10),
	trackingLevel: z.enum(["none", "lot", "serial", "lot+serial"]),
	attributes: z.object().optional(),
});

export const createProductCategory = z.object({});

export type CreateProductInput = z.infer<typeof createProduct>;
export type CreateProductCategoryInput = z.infer<typeof createProductCategory>;
