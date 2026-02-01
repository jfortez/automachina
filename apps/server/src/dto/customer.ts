import { string, z } from "zod";

export const createCustomer = z.object({
	code: z.string(),
	name: z.string(),
	contactInfo: z.object().optional(),
});

export const updateCustomer = createCustomer.partial({ code: true }).extend({
	id: string(),
});

export type CreateCustomerInput = z.infer<typeof createCustomer>;
export type UpdateCustomerInput = z.infer<typeof updateCustomer>;
