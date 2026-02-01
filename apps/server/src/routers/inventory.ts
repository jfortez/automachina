import {
	adjustInventorySchema,
	receiveInventorySchema,
	sellProductSchema,
} from "@/dto/inventory";
import { protectedProcedure, router } from "@/lib/trpc";
import * as inventoryServices from "@/services/inventory";

export const inventoryRouter = router({
	receive: protectedProcedure
		.input(receiveInventorySchema)
		.mutation(async ({ input, ctx }) => {
			return inventoryServices.receiveInventory(input, ctx.organizationId);
		}),
	sell: protectedProcedure
		.input(sellProductSchema)
		.mutation(async ({ input, ctx }) => {
			return inventoryServices.sellProduct(input, ctx.organizationId);
		}),
	adjust: protectedProcedure
		.input(adjustInventorySchema)
		.mutation(async ({ input, ctx }) => {
			return inventoryServices.adjustInventory(input, ctx.organizationId);
		}),
});
