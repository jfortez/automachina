import z from "zod";
import { createWarehouse, createWarehouseLocation } from "@/dto/warehouse";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import * as warehouseService from "@/services/warehouse";

const locationRouter = router({
	getAll: publicProcedure.query(warehouseService.getWarehousesLocation),
	getByOrg: protectedProcedure.query(({ ctx }) => {
		return warehouseService.getWarehouseLocationsByOrg(ctx.organizationId);
	}),
	create: protectedProcedure
		.input(createWarehouseLocation)
		.mutation(({ input }) => {
			return warehouseService.createWarehouseLocation(input);
		}),
});

export const warehouseRouter = router({
	getAll: publicProcedure.query(warehouseService.getWarehouses),
	getByOrg: protectedProcedure.query(({ ctx }) => {
		return warehouseService.getWarehouseByOrg(ctx.organizationId);
	}),
	create: protectedProcedure
		.input(createWarehouse)
		.mutation(({ input, ctx }) => {
			return warehouseService.createWarehouse(input, ctx.organizationId);
		}),
	location: locationRouter,
});
