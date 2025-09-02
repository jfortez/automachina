import { faker } from "@faker-js/faker";
import type { inferProcedureInput } from "@trpc/server";
import type { Session } from "better-auth";
import { nanoid } from "nanoid";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { productCategory } from "@/db/schema/products";
import { auth } from "@/lib/auth";
import type { AppRouter } from "@/routers";
import { createCaller } from "@/routers";

describe("Testing Product Route", () => {
	let caller: ReturnType<typeof createCaller>;
	let firstOrg: NonNullable<
		Awaited<ReturnType<typeof db.query.organizations.findFirst>>
	>;

	beforeEach(async () => {
		const session = await auth.api.signInEmail({
			body: { email: "rylan_reichel@yahoo.com", password: "password" },
			returnHeaders: true,
		});

		caller = createCaller({
			session: {
				user: session.response.user,
				session: {} as Session,
			},
		});

		// Obtén la organización
		const org = await db.query.organizations.findFirst();
		if (!org) {
			throw new Error("No organization found");
		}
		firstOrg = org;
	});

	describe("testing product category route", () => {
		it("get all categories", async () => {
			const categories = await caller.product.category.getAll();
			expect(categories).toBeTruthy();
		});

		it("get category by code", async () => {
			const category = await caller.product.category.getByCode("GENERAL");
			expect(category).toBeTruthy();
			expect(category).toHaveProperty("code", "GENERAL");
		});

		it.sequential("create a category", async () => {
			const newCategory = {
				code: "NEW_CATEGORY",
				name: "New Category",
				organizationId: firstOrg.id,
			};
			const [createdCategory] =
				await caller.product.category.create(newCategory);
			expect(createdCategory).toBeTruthy();
			expect(createdCategory).toHaveProperty("code", newCategory.code);
		});

		it.sequential("update a category", async () => {
			const categoryToUpdate =
				await caller.product.category.getByCode("NEW_CATEGORY");

			if (!categoryToUpdate) {
				throw new Error("Category not found");
			}
			const { id } = categoryToUpdate;

			await caller.product.category.update({
				id: id,
				code: "UPDATED_CATEGORY",
				name: "Updated Category",
				description: "this category was updated",
			});

			const categoryUpdated = await caller.product.category.getById(id);

			expect(categoryUpdated).toBeTruthy();
			expect(categoryUpdated).toHaveProperty("code", "UPDATED_CATEGORY");
			expect(categoryUpdated).toHaveProperty("name", "Updated Category");
		});

		it.sequential("delete a category", async () => {
			const categoryToDelete =
				await caller.product.category.getByCode("UPDATED_CATEGORY");

			if (!categoryToDelete) {
				throw new Error("Category not found");
			}

			await caller.product.category.delete(categoryToDelete.id);

			const deletedCategory = await caller.product.category.getById(
				categoryToDelete.id,
			);
			expect(deletedCategory).toBeFalsy();
		});
	});

	it("create a single product with EA base UOM", async () => {
		let firstCategory = await db.query.productCategory.findFirst();
		if (!firstCategory) {
			const [createdCategory] = await db
				.insert(productCategory)
				.values({
					code: "GENERAL",
					name: "General",
					organizationId: firstOrg.id,
				})
				.returning();
			firstCategory = createdCategory;
		}

		const input: inferProcedureInput<AppRouter["product"]["create"]> = {
			baseUom: "EA",
			name: faker.commerce.productName(),
			description: faker.commerce.productDescription(),
			price: 23.5,
			sku: nanoid(10),
			productUoms: [
				{
					uomCode: "EA",
					qtyInBase: "1",
				},
				{
					uomCode: "PK",
					qtyInBase: "6",
				},
				{
					uomCode: "BX",
					qtyInBase: "36",
				},
			],
			attributes: {
				foo: "bar",
			},
			organizationId: firstOrg.id,
			categoryId: firstCategory.id,
			trackingLevel: "none",
		};

		const createdProduct = await caller.product.create(input);

		expect(createdProduct).toBeTruthy();
	});
});
