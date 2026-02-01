import { z } from "zod";
import { warehouseLocations } from "@/db/schema/warehouse";

export const createWarehouse = z.object({
	name: z.string().min(2).max(100),
	code: z.string().min(2).max(100),
	address: z.string().min(2).max(200),
});

export const createWarehouseLocation = z.object({
	warehouseId: z.string(),
	code: z.string().min(2).max(100),
	type: z.enum(warehouseLocations),
	temperatureMin: z.coerce.string().optional(),
	temperatureMax: z.coerce.string().optional(),
	attributes: z.object({}).optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouse>;
export type CreateWarehouseLocationInput = z.infer<
	typeof createWarehouseLocation
>;
