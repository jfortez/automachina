import { z } from "zod";

export const receiveInventorySchema = z.object({
	productId: z.string(),
	qty: z.number().positive(),
	uomCode: z.string().min(1),
	warehouseId: z.string().optional(),
	cost: z.number().min(0).optional(),
	currency: z.string().default("USD"),
});

export type ReceiveInventoryInput = z.infer<typeof receiveInventorySchema>;

export const sellProductSchema = z.object({
	productId: z.string(),
	lines: z
		.array(
			z.object({
				qty: z.number().positive(),
				uomCode: z.string().min(1),
			}),
		)
		.min(1),
	warehouseId: z.string().optional(),
});

export type SellProductInput = z.infer<typeof sellProductSchema>;

export const adjustInventorySchema = z.object({
	warehouseId: z.string(),
	productId: z.string(),
	adjustmentType: z.enum(["pos", "neg"]),
	qty: z.number().positive(),
	uomCode: z.string().min(1),
	reason: z.string().min(1),
	notes: z.string().optional(),
	physicalCountId: z.string().optional(),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
