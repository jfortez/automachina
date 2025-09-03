import { z } from "zod";

// DTO for receiveInventory
export const receiveInventorySchema = z.object({
	organizationId: z.string(),
	productId: z.string(),
	qty: z.number().positive(),
	uomCode: z.string().min(1),
	warehouseId: z.string().optional(),
	cost: z.number().min(0).optional(), // Unit cost
	currency: z.string().default("USD"),
});

export type ReceiveInventoryInput = z.infer<typeof receiveInventorySchema>;

// DTO for sellProduct (supports multiple lines for mixed UoMs)
export const sellProductSchema = z.object({
	organizationId: z.string(),
	productId: z.string(),
	lines: z
		.array(
			z.object({
				qty: z.number().positive(),
				uomCode: z.string().min(1),
			}),
		)
		.min(1), // e.g., [{qty:1, uomCode:"PK"}, {qty:8, uomCode:"EA"}]
	warehouseId: z.string().optional(),
});

export type SellProductInput = z.infer<typeof sellProductSchema>;
