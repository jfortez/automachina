import z from "zod";

const createOrg = z.object({
	code: z.string().min(2).max(100),
	name: z.string().min(2).max(100),
	description: z.string().max(500).optional(),
});

const addOrgMember = z.object({
	organizationId: z.uuid(),
	members: z.array(z.uuid()),
});

const updateOrg = createOrg.omit({ code: true }).extend({
	id: z.uuid(),
});

export { createOrg, addOrgMember, updateOrg };

export type CreateOrgInput = z.infer<typeof createOrg>;
export type AddOrgMemberInput = z.infer<typeof addOrgMember>;
export type UpdateOrgInput = z.infer<typeof updateOrg>;
