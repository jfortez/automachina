import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { globals } from "./globals";
import { setupTestContext } from "./util";

describe("Testing Supplier Management System", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("Suppliers CRUD Operations", () => {
		it("should get all suppliers", async () => {
			const suppliers = await ctx.caller.supplier.getAll();
			expect(suppliers).toBeDefined();
			expect(Array.isArray(suppliers)).toBe(true);
		});

		it("should get suppliers by organization", async () => {
			const suppliers = await ctx.caller.supplier.getByOrg();
			expect(suppliers).toBeDefined();
			expect(Array.isArray(suppliers)).toBe(true);
			expect(suppliers.length).toBeGreaterThan(0);
		});

		it.sequential("should create a supplier", async () => {
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `TEST_SUP_${nanoid(5)}`,
				name: "Test Supplier Ltda.",
				image: "https://test.com/logo.png",
				contactInfo: {
					email: "contact@test.com",
					phone: "+123456789",
					address: "123 Test St",
				},
			};

			const createdSuppliers = await ctx.caller.supplier.create(supplierInput);
			const createdSupplier = createdSuppliers[0];

			expect(createdSupplier).toBeDefined();
			expect(createdSupplier.code).toBe(supplierInput.code);
			expect(createdSupplier.name).toBe(supplierInput.name);
			expect(createdSupplier.image).toBe(supplierInput.image);
			expect(createdSupplier.contactInfo).toEqual(supplierInput.contactInfo);

			// Verify it can be retrieved
			const retrievedSupplier = await ctx.caller.supplier.getById(
				createdSupplier.id,
			);
			expect(retrievedSupplier).toBeDefined();
			expect(retrievedSupplier?.id).toBe(createdSupplier.id);
		});

		it.sequential("should update a supplier", async () => {
			// Create a supplier first to update
			const createInput: inferProcedureInput<AppRouter["supplier"]["create"]> =
				{
					code: `UPDATE_SUP_${nanoid(5)}`,
					name: "Original Supplier Name",
					contactInfo: { email: "original@test.com" },
				};

			const createdSuppliers = await ctx.caller.supplier.create(createInput);
			const createdSupplier = createdSuppliers[0];

			// Update the supplier
			const updateInput: inferProcedureInput<AppRouter["supplier"]["update"]> =
				{
					id: createdSupplier.id,
					name: "Updated Supplier Name",
					code: `UPDATED_SUP_${nanoid(5)}`,
					contactInfo: { email: "updated@test.com", phone: "+987654321" },
				};

			await ctx.caller.supplier.update(updateInput);

			// Verify update
			const updatedSupplier = await ctx.caller.supplier.getById(
				createdSupplier.id,
			);
			expect(updatedSupplier?.name).toBe("Updated Supplier Name");
			expect(updatedSupplier?.code).toBe(updateInput.code);
			expect(updatedSupplier?.contactInfo).toEqual(updateInput.contactInfo);
		});

		it.sequential("should delete a supplier", async () => {
			// Create a supplier to delete
			const createInput: inferProcedureInput<AppRouter["supplier"]["create"]> =
				{
					code: `DELETE_SUP_${nanoid(5)}`,
					name: "Supplier to Delete",
				};

			const createdSuppliers = await ctx.caller.supplier.create(createInput);
			const createdSupplier = createdSuppliers[0];

			// Delete the supplier
			await ctx.caller.supplier.delete(createdSupplier.id);

			// Verify it's deleted
			const deletedSupplier = await ctx.caller.supplier.getById(
				createdSupplier.id,
			);
			expect(deletedSupplier).toBeUndefined();
		});
	});

	describe("Supplier Products CRUD Operations", () => {
		let supplierId: string;
		let productId: string;

		beforeAll(async () => {
			// Create the necessary data for supplier products tests
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `PROD_SUP_${nanoid(5)}`,
				name: "Supplier for Products Test",
			};

			const createdSuppliers = await ctx.caller.supplier.create(supplierInput);
			supplierId = createdSuppliers[0].id;

			// Create a product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: nanoid(10),
					name: "Test Product for Supplier",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};

			const createdProduct = await ctx.caller.product.create(productInput);
			productId = createdProduct.id;
		});

		it.sequential("should create a supplier product", async () => {
			const supplierProductInput: inferProcedureInput<
				AppRouter["supplier"]["products"]["create"]
			> = {
				supplierId,
				productId,
				supplierSku: "SUPPLIER_SKU_123",
				defaultUom: "PK",
				leadTimeDays: 7,
				minOrderQty: "10.000000000",
			};

			const createdSupplierProducts =
				await ctx.caller.supplier.products.create(supplierProductInput);
			const createdSupplierProduct = createdSupplierProducts[0];

			expect(createdSupplierProduct).toBeDefined();
			expect(createdSupplierProduct.supplierSku).toBe("SUPPLIER_SKU_123");
			expect(createdSupplierProduct.defaultUom).toBe("PK");
			expect(createdSupplierProduct.leadTimeDays).toBe(7);
			expect(createdSupplierProduct.minOrderQty).toBe("10.000000000");
		});

		it.sequential("should get supplier products", async () => {
			const supplierProducts =
				await ctx.caller.supplier.products.getBySupplier(supplierId);
			expect(supplierProducts).toBeDefined();
			expect(Array.isArray(supplierProducts)).toBe(true);
			expect(supplierProducts.length).toBeGreaterThan(0);

			// Should contain our created supplier product
			const ourProduct = supplierProducts.find(
				(sp) => sp.supplierSku === "SUPPLIER_SKU_123",
			);
			expect(ourProduct).toBeDefined();
		});

		it.sequential("should update a supplier product", async () => {
			// First get the supplier product
			const supplierProducts =
				await ctx.caller.supplier.products.getBySupplier(supplierId);
			const productToUpdate = supplierProducts.find(
				(sp) => sp.supplierSku === "SUPPLIER_SKU_123",
			)!;

			expect(productToUpdate).toBeDefined();

			// Update it
			const updateInput: inferProcedureInput<
				AppRouter["supplier"]["products"]["update"]
			> = {
				id: productToUpdate.id,
				supplierSku: "UPDATED_SUPPLIER_SKU",
				defaultUom: "CS",
				leadTimeDays: 14,
				minOrderQty: "25.000000000",
			};

			await ctx.caller.supplier.products.update(updateInput);

			// Verify update - get products again
			const updatedProducts =
				await ctx.caller.supplier.products.getBySupplier(supplierId);
			const updatedProduct = updatedProducts.find(
				(sp) => sp.id === productToUpdate.id,
			);
			if (!updatedProduct) {
				throw new Error("Product not found");
			}

			expect(updatedProduct.supplierSku).toBe("UPDATED_SUPPLIER_SKU");
			expect(updatedProduct.defaultUom).toBe("CS");
			expect(updatedProduct.leadTimeDays).toBe(14);
			expect(updatedProduct.minOrderQty).toBe("25.000000000");
		});

		it.sequential("should delete a supplier product", async () => {
			// Get the product to delete
			const supplierProducts =
				await ctx.caller.supplier.products.getBySupplier(supplierId);
			const productToDelete = supplierProducts.find(
				(sp) => sp.supplierSku === "UPDATED_SUPPLIER_SKU",
			);
			if (!productToDelete) {
				throw new Error("Product not found");
			}

			expect(productToDelete).toBeDefined();

			// Delete it
			await ctx.caller.supplier.products.delete(productToDelete.id);

			// Verify it's deleted
			const remainingProducts =
				await ctx.caller.supplier.products.getBySupplier(supplierId);
			const deletedProduct = remainingProducts.find(
				(sp) => sp.id === productToDelete.id,
			);
			expect(deletedProduct).toBeUndefined();
		});
	});

	describe("Error Handling", () => {
		it.fails("should throw error when creating supplier with duplicate code", async () => {
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: "DUPLICATE_CODE", // Same code
				name: "First Supplier",
			};

			// Create first supplier successfully
			await ctx.caller.supplier.create(supplierInput);

			// Try to create second supplier with same code - should fail
			const duplicateInput = {
				...supplierInput,
				name: "Second Supplier with Same Code",
			};

			await ctx.caller.supplier.create(duplicateInput);
		});

		it("should throw error when updating non-existent supplier", async () => {
			// Use a valid UUID format that doesn't exist in DB
			const nonexistentId = "550e8400-e29b-41d4-a716-446655440000";

			const updateInput: inferProcedureInput<AppRouter["supplier"]["update"]> =
				{
					id: nonexistentId,
					name: "Should Fail",
				};

			await expect(ctx.caller.supplier.update(updateInput)).rejects.toThrow(
				"Supplier not found",
			);
		});

		it("should throw error when deleting non-existent supplier", async () => {
			// Use a valid UUID format that doesn't exist in DB
			const nonexistentId = "550e8400-e29b-41d4-a716-446655440001";

			await expect(ctx.caller.supplier.delete(nonexistentId)).rejects.toThrow(
				"Supplier not found",
			);
		});
	});
});
