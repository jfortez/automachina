import { and, eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { organizations as org, orgMembers } from "../db/schema/organizations";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

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

const validateIsMember = async (userId: string, orgId: string) => {
	// Check if the user is a member of the organization
	const isMember = await db
		.select()
		.from(orgMembers)
		.where(
			and(eq(orgMembers.organizationId, orgId), eq(orgMembers.userId, userId)),
		)
		.limit(1);

	return isMember;
};

export const orgRouter = router({
	getAll: publicProcedure.query(async () => {
		const organizations = await db.select().from(org);
		return organizations;
	}),
	create: protectedProcedure
		.input(createOrg)
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;
			const newOrg = await db.insert(org).values(input).returning();

			await db.insert(orgMembers).values({
				organizationId: newOrg[0].id,
				userId: user.id,
			});

			return newOrg;
		}),

	findOne: publicProcedure.input(z.string()).query(async ({ input }) => {
		const organization = await db
			.select()
			.from(org)
			.where(eq(org.id, input))
			.limit(1);
		return organization;
	}),

	findByUser: protectedProcedure.query(async ({ ctx }) => {
		const user = ctx.session.user;
		const organizations = await db
			.select()
			.from(org)
			.innerJoin(orgMembers, eq(org.id, orgMembers.organizationId))

			.where(eq(orgMembers.userId, user.id));
		return organizations;
	}),

	addMembers: protectedProcedure
		.input(addOrgMember)
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;
			const { organizationId, members } = input;

			// Check if the user is a member of the organization
			const isMember = await validateIsMember(user.id, organizationId);

			if (!isMember) {
				throw new Error("User is not a member of the organization");
			}

			// Add the new members to the organization
			await db.insert(orgMembers).values(
				members.map((memberId) => ({
					organizationId,
					userId: memberId,
				})),
			);

			return { success: true };
		}),

	update: protectedProcedure
		.input(updateOrg)
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;

			const isMember = await validateIsMember(user.id, input.id);

			if (!isMember) {
				throw new Error("User is not a member of the organization");
			}

			await db.update(org).set(input).where(eq(org.id, input.id));

			return { success: true };
		}),

	delete: protectedProcedure
		.input(z.string())
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;

			const isMember = await validateIsMember(user.id, input);

			if (!isMember) {
				throw new Error("User is not a member of the organization");
			}

			await db.delete(org).where(eq(org.id, input));

			return { success: true };
		}),
});
