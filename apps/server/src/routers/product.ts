import { z } from "zod";
import { createProduct } from "@/dto/product";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import * as productServices from "@/services/product";

export const productRouter = router({
	getAll: publicProcedure.query(productServices.getAllProducts),
	getById: publicProcedure.input(z.string()).query(({ input }) => {
		return productServices.getProductById(input);
	}),
	getByOrg: protectedProcedure.input(z.string()).query(({ input }) => {
		return productServices.getProductsByOrg(input);
	}),
	create: protectedProcedure.input(createProduct).mutation(({ input }) => {
		return productServices.createProduct(input);
	}),
});
