import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { orgRouter } from "./organization";
import { supplierRouter } from "./supplier";
import { todoRouter } from "./todo";
import { warehouseRouter } from "./warehouse";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	todo: todoRouter,
	warehouse: warehouseRouter,
	organization: orgRouter,
	supplier: supplierRouter,
});
export type AppRouter = typeof appRouter;
