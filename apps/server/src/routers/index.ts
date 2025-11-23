import {
	createCallerFactory,
	protectedProcedure,
	publicProcedure,
	router,
} from "../lib/trpc";
import { customerRouter } from "./customer";
import { fileRouter } from "./files";
import { inventoryRouter } from "./inventory";
import { invoiceRouter } from "./invoice";
import { orderRouter } from "./order";
import { orgRouter } from "./organization";
import { productRouter } from "./product";
import { supplierRouter } from "./supplier";
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
	warehouse: warehouseRouter,
	organization: orgRouter,
	supplier: supplierRouter,
	product: productRouter,
	uom: uomRouter,
	customer: customerRouter,
	inventory: inventoryRouter,
	order: orderRouter,
	invoice: invoiceRouter,
	files: fileRouter,
});

export const createCaller = createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;
