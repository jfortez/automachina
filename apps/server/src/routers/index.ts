import {
	createCallerFactory,
	protectedProcedure,
	publicProcedure,
	router,
} from "../lib/trpc";
import { customerRouter } from "./customer";
import { orgRouter } from "./organization";
import { productRouter } from "./product";
import { supplierRouter } from "./supplier";
import { todoRouter } from "./todo";
import { uomRouter } from "./uom";
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
	product: productRouter,
	uom: uomRouter,
	customer: customerRouter,
});

export const createCaller = createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;
