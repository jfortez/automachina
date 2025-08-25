import { z } from "zod";

export const createWarehouse = z.object({
	name: z.string().min(2).max(100),
	code: z.string().min(2).max(100),
	address: z.string().min(2).max(200),
	organizationId: z.string(),
});

export const createWarehouseLocation = z.object({
	warehouseId: z.string(),
	code: z.string().min(2).max(100),
	type: z.enum([
		"storage",
		"staging_in",
		"staging_out",
		"qc_hold",
		"damaged",
		"returns",
	]),
	temperatureMin: z.number().optional(),
	temperatureMax: z.number().optional(),
	attributes: z.object({}).optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouse>;
export type CreateWarehouseLocationInput = z.infer<
	typeof createWarehouseLocation
>;
