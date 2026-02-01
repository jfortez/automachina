import { z } from "zod";
import {
	createPurchaseOrderSchema,
	createSalesOrderSchema,
	getOrderByIdSchema,
	listPurchaseOrdersSchema,
	listSalesOrdersSchema,
	receivePurchaseOrderSchema,
	updatePurchaseOrderSchema,
	updateSalesOrderSchema,
} from "@/dto/order";
import { protectedProcedure, router } from "@/lib/trpc";
import * as orderServices from "@/services/order";

export const orderRouter = router({
	sales: router({
		create: protectedProcedure
			.input(createSalesOrderSchema)
			.mutation(async ({ input, ctx }) => {
				return orderServices.createSalesOrder(input, ctx.organizationId);
			}),

		getById: protectedProcedure
			.input(getOrderByIdSchema)
			.query(async ({ input }) => {
				return orderServices.getSalesOrderById(input);
			}),

		list: protectedProcedure
			.input(listSalesOrdersSchema)
			.query(async ({ input, ctx }) => {
				return orderServices.getSalesOrders(input, ctx.organizationId);
			}),

		update: protectedProcedure
			.input(updateSalesOrderSchema)
			.mutation(async ({ input }) => {
				return orderServices.updateSalesOrder(input);
			}),

		fulfill: protectedProcedure
			.input(z.string())
			.mutation(async ({ input }) => {
				return orderServices.fulfillSalesOrder(input);
			}),

		cancel: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
			return orderServices.cancelSalesOrder(input);
		}),
	}),

	purchase: router({
		create: protectedProcedure
			.input(createPurchaseOrderSchema)
			.mutation(async ({ input, ctx }) => {
				return orderServices.createPurchaseOrder(input, ctx.organizationId);
			}),

		getById: protectedProcedure
			.input(getOrderByIdSchema)
			.query(async ({ input }) => {
				return orderServices.getPurchaseOrderById(input);
			}),

		list: protectedProcedure
			.input(listPurchaseOrdersSchema)
			.query(async ({ input, ctx }) => {
				return orderServices.getPurchaseOrders(input, ctx.organizationId);
			}),

		update: protectedProcedure
			.input(updatePurchaseOrderSchema)
			.mutation(async ({ input }) => {
				return orderServices.updatePurchaseOrder(input);
			}),

		receive: protectedProcedure
			.input(receivePurchaseOrderSchema)
			.mutation(async ({ input }) => {
				return orderServices.receivePurchaseOrder(input);
			}),
	}),
});
