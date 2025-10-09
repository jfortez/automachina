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
	// Sales Orders
	sales: router({
		create: protectedProcedure
			.input(createSalesOrderSchema)
			.mutation(async ({ input }) => {
				return orderServices.createSalesOrder(input);
			}),

		getById: protectedProcedure
			.input(getOrderByIdSchema)
			.query(async ({ input }) => {
				return orderServices.getSalesOrderById(input);
			}),

		list: protectedProcedure
			.input(listSalesOrdersSchema)
			.query(async ({ input }) => {
				return orderServices.getSalesOrders(input);
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
			.mutation(async ({ input }) => {
				return orderServices.createPurchaseOrder(input);
			}),

		getById: protectedProcedure
			.input(getOrderByIdSchema)
			.query(async ({ input }) => {
				return orderServices.getPurchaseOrderById(input);
			}),

		list: protectedProcedure
			.input(listPurchaseOrdersSchema)
			.query(async ({ input }) => {
				return orderServices.getPurchaseOrders(input);
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
