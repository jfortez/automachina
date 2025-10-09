import { z } from "zod";

// UOM schemas
export const createUom = z.object({
	code: z.string().min(1).max(20),
	name: z.string().min(1),
	system: z.enum(["UNECE", "UCUM"]),
	category: z.enum([
		"count",
		"mass",
		"volume",
		"length",
		"area",
		"time",
		"other",
	]),
	isPackaging: z.boolean().default(false),
});

export const updateUom = createUom.partial().extend({
	code: z.string().min(1).max(20),
});

// UOM Conversion schemas
export const createUomConversion = z.object({
	fromUom: z.string().min(1),
	toUom: z.string().min(1),
	factor: z.string(), // Using string for precise decimal handling
});

export const updateUomConversion = createUomConversion.partial().extend({
	fromUom: z.string().min(1),
	toUom: z.string().min(1),
});

export type CreateUomInput = z.infer<typeof createUom>;
export type UpdateUomInput = z.infer<typeof updateUom>;
export type CreateUomConversionInput = z.infer<typeof createUomConversion>;
export type UpdateUomConversionInput = z.infer<typeof updateUomConversion>;
