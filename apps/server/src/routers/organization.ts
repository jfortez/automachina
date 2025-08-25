import z from "zod";
import { addOrgMember, createOrg, updateOrg } from "@/dto/organization";
import { organizationService } from "@/services/organization";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

export const orgRouter = router({
	getAll: publicProcedure.query(organizationService.getAllOrganizations),
	create: protectedProcedure
		.input(createOrg)
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;
			return organizationService.createOrganization(input, user);
		}),

	findOne: publicProcedure.input(z.string()).query(async ({ input }) => {
		return organizationService.getOrganizationById(input);
	}),

	findByUser: protectedProcedure.query(async ({ ctx }) => {
		const user = ctx.session.user;
		return organizationService.getOrganizationsByUser(user.id);
	}),

	addMembers: protectedProcedure
		.input(addOrgMember)
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;

			await organizationService.addOrgMember(input, user);
			return { success: true };
		}),

	update: protectedProcedure
		.input(updateOrg)
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;

			await organizationService.updateOrganization(input, user);

			return { success: true };
		}),

	delete: protectedProcedure
		.input(z.string())
		.mutation(async ({ input, ctx }) => {
			const user = ctx.session.user;

			await organizationService.deleteOrganization(input, user);
			return { success: true };
		}),
});
