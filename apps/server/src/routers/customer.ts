import z from "zod";
import { createCustomer, updateCustomer } from "@/dto/customer";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import * as customerService from "@/services/customer";

export const customerRouter = router({
	getAll: publicProcedure.query(customerService.getAllCustomers),
	getById: publicProcedure
		.input(z.string())
		.query((opts) => customerService.getCustomerById(opts.input)),
	create: protectedProcedure
		.input(createCustomer)
		.mutation(({ input, ctx }) =>
			customerService.createCustomer(input, ctx.organizationId),
		),
	update: protectedProcedure
		.input(updateCustomer)
		.mutation(({ input }) => customerService.updateCustomer(input)),
	delete: protectedProcedure
		.input(z.string())
		.mutation(({ input }) => customerService.deleteCustomer(input)),
});
