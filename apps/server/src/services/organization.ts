import { TRPCError } from "@trpc/server";
import type { User } from "better-auth";
import { and, eq } from "drizzle-orm";
import type {
	AddOrgMemberInput,
	CreateOrgInput,
	UpdateOrgInput,
} from "@/dto/organization";
import { db } from "../db";
import { organizations as org, orgMembers } from "../db/schema/organizations";

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

const getAllOrganizations = async () => {
	const organizations = await db.select().from(org);
	return organizations;
};

const getOrganizationById = async (id: string) => {
	const organization = await db
		.select()
		.from(org)
		.where(eq(org.id, id))
		.limit(1);
	return organization;
};

const getOrganizationsByUser = async (userId: string) => {
	const organizations = await db
		.select()
		.from(org)
		.innerJoin(orgMembers, eq(org.id, orgMembers.organizationId))
		.where(eq(orgMembers.userId, userId));
	return organizations;
};

const createOrganization = async (data: CreateOrgInput, user: User) => {
	const newOrg = await db.insert(org).values(data).returning();

	await db.insert(orgMembers).values({
		organizationId: newOrg[0].id,
		userId: user.id,
	});

	return newOrg;
};

const updateOrganization = async (
	{ id, ...input }: UpdateOrgInput,
	user: User,
) => {
	const isMember = await validateIsMember(user.id, id);

	if (!isMember) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "User is not a member of the organization",
		});
	}

	await db.update(org).set(input).where(eq(org.id, id));
};

const deleteOrganization = async (id: string, user: User) => {
	const isMember = await validateIsMember(user.id, id);

	if (!isMember) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "User is not a member of the organization",
		});
	}

	await db.delete(org).where(eq(org.id, id));
};

const addOrgMember = async (input: AddOrgMemberInput, user: User) => {
	const { members, organizationId } = input;

	const isMember = await validateIsMember(user.id, organizationId);

	if (!isMember) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "User is not a member of the organization",
		});
	}

	await db.insert(orgMembers).values(
		members.map((memberId) => ({
			organizationId,
			userId: memberId,
		})),
	);
};

export const organizationService = {
	getAllOrganizations,
	getOrganizationById,
	createOrganization,
	updateOrganization,
	addOrgMember,
	deleteOrganization,
	getOrganizationsByUser,
};
