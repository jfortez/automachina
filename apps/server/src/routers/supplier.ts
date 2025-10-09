import { z } from "zod";
import {
	createSupplier,
	createSupplierProduct,
	updateSupplier,
	updateSupplierProduct,
} from "@/dto/supplier";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import * as supplierServices from "@/services/supplier";

export const supplierRouter = router({
	getAll: publicProcedure.query(supplierServices.getAllSuppliers),
	getById: publicProcedure.input(z.string()).query(({ input }) => {
		return supplierServices.getSupplierById(input);
	}),
	getByOrg: protectedProcedure.input(z.string()).query(({ input }) => {
		return supplierServices.getSuppliersByOrg(input);
	}),
	create: protectedProcedure.input(createSupplier).mutation(({ input }) => {
		return supplierServices.createSupplier(input);
	}),
	update: protectedProcedure.input(updateSupplier).mutation(({ input }) => {
		return supplierServices.updateSupplier(input);
	}),
	delete: protectedProcedure.input(z.string()).mutation(({ input }) => {
		return supplierServices.deleteSupplier(input);
	}),
	products: router({
		getBySupplier: publicProcedure.input(z.string()).query(({ input }) => {
			return supplierServices.getSupplierProducts(input);
		}),
		create: protectedProcedure
			.input(createSupplierProduct)
			.mutation(({ input }) => {
				return supplierServices.createSupplierProduct(input);
			}),
		update: protectedProcedure
			.input(updateSupplierProduct)
			.mutation(({ input }) => {
				return supplierServices.updateSupplierProduct(input);
			}),
		delete: protectedProcedure.input(z.string()).mutation(({ input }) => {
			return supplierServices.deleteSupplierProduct(input);
		}),
	}),
});
