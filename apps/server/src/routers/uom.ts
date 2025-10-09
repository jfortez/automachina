import z from "zod";
import {
	createUomConversion as createUomConversionSchema,
	createUom as createUomSchema,
	updateUomConversion as updateUomConversionSchema,
	updateUom as updateUomSchema,
} from "@/dto/uom";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import {
	createUom,
	createUomConversion,
	getAllUom,
	getUomByCode,
	updateUom,
	updateUomConversion,
} from "@/services/uom";

export const uomRouter = router({
	getAll: publicProcedure.query(() => getAllUom()),
	getByCode: publicProcedure
		.input(z.string())
		.query((opts) => getUomByCode(opts.input)),
	create: protectedProcedure
		.input(createUomSchema)
		.mutation(({ input }) => createUom(input)),
	update: protectedProcedure
		.input(updateUomSchema)
		.mutation(({ input }) => updateUom(input)),
	conversion: router({
		create: protectedProcedure
			.input(createUomConversionSchema)
			.mutation(({ input }) => createUomConversion(input)),
		update: protectedProcedure
			.input(updateUomConversionSchema)
			.mutation(({ input }) => updateUomConversion(input)),
	}),
});
