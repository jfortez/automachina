import { initTRPC, TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { member as orgMember } from "@/db/schema/auth";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

const validateUserMembership = async (
	userId: string,
	organizationId: string,
): Promise<boolean> => {
	const membership = await db
		.select({ id: orgMember.id })
		.from(orgMember)
		.where(
			and(
				eq(orgMember.organizationId, organizationId),
				eq(orgMember.userId, userId),
			),
		)
		.limit(1);

	return membership.length > 0;
};

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}

	const organizationId = ctx.session.session.activeOrganizationId;

	if (!organizationId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "No active organization selected",
		});
	}

	const isMember = await validateUserMembership(
		ctx.session.user.id,
		organizationId,
	);

	if (!isMember) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "User is not a member of this organization",
		});
	}

	return next({
		ctx: {
			...ctx,
			session: ctx.session,
			organizationId,
		},
	});
});

export const createCallerFactory = t.createCallerFactory;
