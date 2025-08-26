import z from "zod";
import { publicProcedure, router } from "@/lib/trpc";
import { getAllUom, getUomByCode } from "@/services/uom";

export const uomRouter = router({
	getAll: publicProcedure.query(() => getAllUom()),
	getByCode: publicProcedure
		.input(z.string())
		.query((opts) => getUomByCode(opts.input)),
});
