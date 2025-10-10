import { TRPCError } from "@trpc/server";
import type { User } from "better-auth";
import { and, eq } from "drizzle-orm";
import type {
	AddOrgMemberInput,
	CreateOrgInput,
	UpdateOrgInput,
} from "@/dto/organization";
import { createBucket } from "@/lib/s3";
import { db } from "../db";
import { organizations as org, orgMembers } from "../db/schema/organizations";
import { priceList, productCategory } from "../db/schema/products";
import { locations, warehouses } from "../db/schema/warehouse";

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
	return await db.transaction(async (tx) => {
		const newOrg = await tx.insert(org).values(data).returning();

		const orgId = newOrg[0].id;
		await createBucket(`org-${orgId}`);

		await tx.insert(orgMembers).values({
			organizationId: orgId,
			userId: user.id,
		});

		// Create default warehouse
		const [warehouse] = await tx
			.insert(warehouses)
			.values({
				organizationId: orgId,
				code: "default",
				name: "Default Warehouse",
				address: {},
			})
			.returning();

		// Create default warehouse location
		await tx.insert(locations).values({
			warehouseId: warehouse.id,
			code: "storage",
			type: "storage",
		});

		// Create default public price list
		await tx.insert(priceList).values({
			organizationId: orgId,
			code: "default",
			name: "Default Price List",
			type: "public",
			currency: "USD",
		});

		// Create default product category
		await tx.insert(productCategory).values({
			organizationId: orgId,
			code: "general",
			name: "General",
			description: "Default general category",
		});

		return newOrg;
	});
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
