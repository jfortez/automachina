import { receiveInventorySchema, sellProductSchema } from "@/dto/inventory";
import { protectedProcedure, router } from "@/lib/trpc";
import * as inventoryServices from "@/services/inventory";

export const inventoryRouter = router({
	receive: protectedProcedure
		.input(receiveInventorySchema)
		.mutation(async ({ input }) => {
			return inventoryServices.receiveInventory(input);
		}),
	sell: protectedProcedure
		.input(sellProductSchema)
		.mutation(async ({ input }) => {
			return inventoryServices.sellProduct(input);
		}),
});
