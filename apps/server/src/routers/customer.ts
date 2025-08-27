import z from "zod";
import { createCustomer, updateCustomer } from "@/dto/customer";
import { publicProcedure, router } from "@/lib/trpc";
import * as customerService from "@/services/customer";

export const customerRouter = router({
	getAll: publicProcedure.query(customerService.getAllCustomers),
	create: publicProcedure
		.input(createCustomer)
		.mutation(({ input }) => customerService.createCustomer(input)),
	update: publicProcedure
		.input(updateCustomer)
		.mutation(({ input }) => customerService.updateCustomer(input)),
	delete: publicProcedure
		.input(z.string())
		.mutation(({ input }) => customerService.deleteCustomer(input)),
});
