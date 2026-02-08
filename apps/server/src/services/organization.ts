import { TRPCError } from "@trpc/server";
import type { User } from "better-auth";
import { and, eq } from "drizzle-orm";
import type {
	AddOrgMemberInput,
	CreateOrganizationSettingsInput,
	CreateOrgInput,
	GetOrganizationSettingsInput,
	UpdateOrganizationSettingsInput,
	UpdateOrgInput,
} from "@/dto/organization";
import { auth } from "@/lib/auth";
import { createBucket } from "@/lib/s3";
import { db } from "../db";
import {
	organization as org,
	member as orgMember,
	user,
} from "../db/schema/auth";
import { organizationSettings } from "../db/schema/organization";
import { priceList, productCategory } from "../db/schema/products";
import { locations, warehouses } from "../db/schema/warehouse";

const validateIsMember = async (userId: string, orgId: string) => {
	// Check if the user is a member of the organization

	const isMember = await db
		.select()
		.from(orgMember)
		.where(
			and(eq(orgMember.organizationId, orgId), eq(orgMember.userId, userId)),
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
		.innerJoin(orgMember, eq(org.id, orgMember.organizationId))
		.where(eq(orgMember.userId, userId));
	return organizations;
};

const createOrganization = async (data: CreateOrgInput, user: User) => {
	try {
		const newOrg = await auth.api.createOrganization({
			body: {
				name: data.name, // required
				slug: data.code, // required
				// logo: "https://example.com/logo.png",
				// metadata,
				userId: user.id,
				keepCurrentActiveOrganization: false,
			},
		});

		await createBucket(`org-${newOrg?.slug}`);
		//TODO: make this to hook
		const orgId = newOrg!.id;

		const [warehouse] = await db
			.insert(warehouses)
			.values({
				organizationId: orgId,
				code: "default",
				name: "Default Warehouse",
				address: {},
			})
			.returning();

		// Create default warehouse location
		await db.insert(locations).values({
			warehouseId: warehouse.id,
			code: "storage",
			type: "storage",
		});

		// Create default public price list
		await db.insert(priceList).values({
			organizationId: orgId,
			code: "default",
			name: "Default Price List",
			type: "public",
			currency: "USD",
		});

		// Create default product category
		await db.insert(productCategory).values({
			organizationId: orgId,
			code: "general",
			name: "General",
			description: "Default general category",
		});

		// Create default organization settings
		await db.insert(organizationSettings).values({
			organizationId: orgId,
			// All other fields use schema defaults
		});

		return newOrg!;
	} catch (error) {
		console.log(error);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create organization",
		});
	}
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

const addOrgMember = async (input: AddOrgMemberInput, creator: User) => {
	const { members, organizationId } = input;

	const isMember = await validateIsMember(creator.id, organizationId);

	if (!isMember) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "User is not a member of this organization",
		});
	}

	const validUsers = await Promise.all(
		members.map(async (userId) => {
			const validUser = await db.query.user.findFirst({
				where: eq(user.id, userId),
			});

			if (!validUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invalid User Input",
				});
			}

			return validUser;
		}),
	);

	await Promise.all(
		validUsers.map(async (user) => {
			await auth.api.addMember({
				body: {
					userId: user.id,
					role: ["member"],
					organizationId: organizationId,
				},
			});
		}),
	);
};

const getActiveOrganization = async (userId: string) => {
	const organization = await db.query.organization.findFirst({
		with: {
			members: {
				where: eq(orgMember.userId, userId),
			},
		},
	});

	if (!organization) {
		return null;
	}

	return organization;
};

const createOrganizationSettings = async (
	input: CreateOrganizationSettingsInput,
) => {
	const [existing] = await db
		.select({ id: organizationSettings.id })
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, input.organizationId))
		.limit(1);

	if (existing) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Organization settings already exist",
		});
	}

	const [settings] = await db
		.insert(organizationSettings)
		.values({
			...input,
			defaultTaxPercent: input.defaultTaxPercent.toString(),
			maxDiscountPercent: input.maxDiscountPercent.toString(),
			orderApprovalThreshold: input.orderApprovalThreshold?.toString(),
			maxCashDiscrepancy: input.maxCashDiscrepancy.toString(),
		})
		.returning();

	return settings;
};

const getOrganizationSettings = async (input: GetOrganizationSettingsInput) => {
	const [settings] = await db
		.select()
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, input.organizationId))
		.limit(1);

	if (!settings) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Organization settings not found",
		});
	}

	return settings;
};

const updateOrganizationSettings = async (
	input: UpdateOrganizationSettingsInput,
) => {
	const { id, ...data } = input;

	const [existing] = await db
		.select()
		.from(organizationSettings)
		.where(eq(organizationSettings.id, id))
		.limit(1);

	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Organization settings not found",
		});
	}

	// Define fields that need string conversion for PostgreSQL numeric columns
	const numericFields = new Set([
		"defaultTaxPercent",
		"maxDiscountPercent",
		"orderApprovalThreshold",
		"maxCashDiscrepancy",
	]);

	// Build update data using declarative mapping
	const updateData: Partial<typeof organizationSettings.$inferInsert> = {};

	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || key === "id") continue;

		// Handle numeric fields that need string conversion for PostgreSQL
		if (numericFields.has(key)) {
			(updateData as Record<string, unknown>)[key] = value?.toString();
		} else {
			(updateData as Record<string, unknown>)[key] = value;
		}
	}

	const [settings] = await db
		.update(organizationSettings)
		.set(updateData)
		.where(eq(organizationSettings.id, id))
		.returning();

	return settings;
};

export const organizationService = {
	getAllOrganizations,
	getOrganizationById,
	createOrganization,
	updateOrganization,
	addOrgMember,
	deleteOrganization,
	getOrganizationsByUser,
	getActiveOrganization,
	createOrganizationSettings,
	getOrganizationSettings,
	updateOrganizationSettings,
};
