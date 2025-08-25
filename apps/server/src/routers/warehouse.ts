import z from "zod";
import { createWarehouse, createWarehouseLocation } from "@/dto/warehouse";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import * as warehouseService from "@/services/warehouse";

const locationRouter = router({
	getAll: publicProcedure.query(warehouseService.getWarehousesLocation),
	getByOrg: protectedProcedure.input(z.string()).query(({ input }) => {
		return warehouseService.getWarehouseLocationsByOrg(input);
	}),
	create: protectedProcedure
		.input(createWarehouseLocation)
		.mutation(({ input }) => {
			return warehouseService.createWarehouseLocation(input);
		}),
});

export const warehouseRouter = router({
	getAll: publicProcedure.query(warehouseService.getWarehouses),
	getByOrg: protectedProcedure.input(z.string()).query(({ input }) => {
		return warehouseService.getWarehouseByOrg(input);
	}),
	create: protectedProcedure.input(createWarehouse).mutation(({ input }) => {
		return warehouseService.createWarehouse(input);
	}),
	location: locationRouter,
});
