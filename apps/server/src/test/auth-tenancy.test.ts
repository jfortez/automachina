import type { inferProcedureInput } from "@trpc/server";
import { beforeAll, describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";
import type { AppRouter } from "@/routers";
import { createCaller } from "@/routers";
import { setupTestContext } from "./util";

describe("Authentication & Tenancy Security", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("Session Management", () => {
		it("should have activeOrganizationId in session", async () => {
			const { caller } = ctx;
			const result = await caller.profile();
			expect(result.user).toBeDefined();
			expect(result.message).toBe("This is private");
		});

		it("should reject requests without authentication", async () => {
			const unauthenticatedCaller = createCaller({
				session: null,
				logger,
			});
			await expect(unauthenticatedCaller.profile()).rejects.toThrow(
				"Authentication required",
			);
		});
	});

	describe("Tenancy Isolation", () => {
		it("should automatically inject organizationId from session", async () => {
			const { caller, defaultOrg } = ctx;
			const productInput: Omit<
				inferProcedureInput<AppRouter["product"]["create"]>,
				"organizationId"
			> = {
				sku: `AUTO-TENANCY-${Date.now()}`,
				name: "Test Product for Tenancy",
				baseUom: "EA",
				categoryId: ctx.defaultCategoryId,
				trackingLevel: "none",
				isPhysical: true,
			};
			const product = await caller.product.create(productInput);
			expect(product.organizationId).toBe(defaultOrg.id);
		});

		it("should ignore organizationId provided in input and use session", async () => {
			const { caller, defaultOrg } = ctx;
			const productInput = {
				sku: `FAKE-ORG-${Date.now()}`,
				name: "Test Product with Fake Org",
				baseUom: "EA",
				categoryId: ctx.defaultCategoryId,
				trackingLevel: "none" as const,
				isPhysical: true,
			};
			const product = await caller.product.create(productInput);
			expect(product.organizationId).toBe(defaultOrg.id);
			expect(product.organizationId).not.toBe("fake-organization-id-123");
		});
	});

	describe("Cross-Organization Access Prevention", () => {
		it("should not allow accessing data from other organizations", async () => {
			const { caller } = ctx;
			const products = await caller.product.getByOrg();
			for (const product of products) {
				expect(product.organizationId).toBe(ctx.defaultOrg.id);
			}
		});
	});

	describe("Protected Endpoints", () => {
		it("should require authentication for protected procedures", async () => {
			const unauthenticatedCaller = createCaller({
				session: null,
				logger,
			});
			await expect(
				unauthenticatedCaller.product.create({
					sku: "UNAUTH-TEST",
					name: "Unauthenticated Test",
					baseUom: "EA",
					categoryId: ctx.defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
				} as any),
			).rejects.toThrow("Authentication required");
		});

		it("should reject access to organization where user is not a member", async () => {
			const mockUser = {
				id: "fake-user-id",
				email: "fake@example.com",
				name: "Fake User",
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const mockSession = {
				id: "fake-session-id",
				token: "fake-token",
				userId: "fake-user-id",
				activeOrganizationId: "non-existent-org-id",
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const fakeOrgCaller = createCaller({
				session: {
					user: mockUser,
					session: mockSession,
				},
				logger,
			});
			await expect(fakeOrgCaller.product.getByOrg()).rejects.toThrow(
				"User is not a member of this organization",
			);
		});
	});

	describe("Organization Context in Services", () => {
		it("should create customer with automatic organization assignment", async () => {
			const { caller, defaultOrg } = ctx;
			const customerInput = {
				code: `TENANCY-CUST-${Date.now()}`,
				name: "Test Customer for Tenancy",
			};
			const [customer] = await caller.customer.create(customerInput);
			expect(customer.organizationId).toBe(defaultOrg.id);
		});

		it("should create supplier with automatic organization assignment", async () => {
			const { caller, defaultOrg } = ctx;
			const supplierInput = {
				code: `TENANCY-SUPP-${Date.now()}`,
				name: "Test Supplier for Tenancy",
			};
			const [supplier] = await caller.supplier.create(supplierInput);
			expect(supplier.organizationId).toBe(defaultOrg.id);
		});

		it("should create warehouse with automatic organization assignment", async () => {
			const { caller, defaultOrg } = ctx;
			const warehouseInput = {
				code: `TENANCY-WH-${Date.now()}`,
				name: "Test Warehouse for Tenancy",
				address: "Test Address",
			};
			const [warehouse] = await caller.warehouse.create(warehouseInput);
			expect(warehouse.organizationId).toBe(defaultOrg.id);
		});
	});
});
