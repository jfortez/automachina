import { z } from "zod";
import {
	createProduct,
	createProductCategory,
	updateProductCategory,
} from "@/dto/product";
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
	category: router({
		getAll: publicProcedure.query(productServices.getAllProductCategories),
		getById: publicProcedure.input(z.string()).query(({ input }) => {
			return productServices.getProductCategoryById(input);
		}),
		getByCode: publicProcedure.input(z.string()).query(({ input }) => {
			return productServices.getProductCategoryByCode(input);
		}),
		create: protectedProcedure
			.input(createProductCategory)
			.mutation(({ input }) => {
				return productServices.createProductCategory(input);
			}),
		update: protectedProcedure
			.input(updateProductCategory)
			.mutation(({ input }) => {
				return productServices.updateProductCategory(input);
			}),
		delete: protectedProcedure.input(z.string()).mutation(({ input }) => {
			return productServices.deleteProductCategory(input);
		}),
	}),
});
