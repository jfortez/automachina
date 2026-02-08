import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { setupTestContext } from "./util";

describe("Commercial Documents Management", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let defaultCustomer: { id: string; name: string; code: string };
	let testProduct: { id: string; name: string; baseUom: string };

	beforeAll(async () => {
		ctx = await setupTestContext();

		const testUom = await ctx.caller.uom.getByCode("EA");
		if (!testUom) {
			throw new Error("No UOM found in database");
		}

		const categoryInput: inferProcedureInput<
			AppRouter["product"]["category"]["create"]
		> = {
			code: `test-cat-${nanoid(6)}`,
			name: "Test Category",
		};

		const [category] = await ctx.caller.product.category.create(categoryInput);

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: `test-prod-${nanoid(8)}`,
			name: "Test Product",
			description: "Product for testing commercial documents",
			baseUom: testUom.code,
			categoryId: category.id,
			trackingLevel: "none",
			isPhysical: true,
			prices: [{ uomCode: testUom.code, price: 1.0 }],
		};

		const createdProduct = await ctx.caller.product.create(productInput);
		testProduct = {
			id: createdProduct.id,
			name: createdProduct.name,
			baseUom: createdProduct.baseUom,
		};

		const customerInput: inferProcedureInput<AppRouter["customer"]["create"]> =
			{
				code: `test-cust-${nanoid(8)}`,
				name: "Test Customer",
			};

		const [createdCustomer] = await ctx.caller.customer.create(customerInput);
		defaultCustomer = {
			id: createdCustomer.id,
			name: createdCustomer.name,
			code: createdCustomer.code,
		};
	});

	it.sequential("should create an invoice", async () => {
		const { caller } = ctx;

		const input: inferProcedureInput<
			AppRouter["commercialDocument"]["create"]
		> = {
			documentType: "invoice",
			issueDate: new Date().toISOString().split("T")[0],
			customerId: defaultCustomer.id,
			lines: [
				{
					productId: testProduct.id,
					description: testProduct.name,
					quantity: 2,
					uomCode: testProduct.baseUom,
					unitPrice: 50,
					taxPercent: 15,
				},
			],
		};

		const result = await caller.commercialDocument.create(input);

		expect(result.result.document).toBeDefined();
		expect(result.result.document.documentType).toBe("invoice");
		expect(result.result.document.documentNumber).toMatch(/^FAC-/);
		expect(result.result.lines).toHaveLength(1);
		expect(Number(result.result.document.total)).toBe(115);
	});

	it.sequential("should create a sales note", async () => {
		const { caller } = ctx;

		const input: inferProcedureInput<
			AppRouter["commercialDocument"]["create"]
		> = {
			documentType: "sales_note",
			issueDate: new Date().toISOString().split("T")[0],
			lines: [
				{
					description: testProduct.name,
					quantity: 1,
					uomCode: testProduct.baseUom,
					unitPrice: 25,
				},
			],
		};

		const result = await caller.commercialDocument.create(input);

		expect(result.result.document.documentType).toBe("sales_note");
		expect(result.result.document.documentNumber).toMatch(/^NV-/);
	});

	it.sequential("should create a delivery guide with transport info", async () => {
		const { caller } = ctx;

		const input: inferProcedureInput<
			AppRouter["commercialDocument"]["create"]
		> = {
			documentType: "delivery_guide",
			issueDate: new Date().toISOString().split("T")[0],
			customerId: defaultCustomer.id,
			lines: [
				{
					productId: testProduct.id,
					description: testProduct.name,
					quantity: 5,
					uomCode: testProduct.baseUom,
					unitPrice: 0,
				},
			],
			transportInfo: {
				transportMode: "vehicle",
				vehiclePlate: "ABC-123",
				driverName: "Juan Perez",
				originAddress: "Bodega Principal",
				destinationAddress: "Dirección Cliente",
			},
		};

		const result = await caller.commercialDocument.create(input);

		expect(result.result.document.documentType).toBe("delivery_guide");
		expect(result.result.document.transportInfo).toBeDefined();
		expect(result.result.document.transportInfo?.vehiclePlate).toBe("ABC-123");
	});

	it.sequential("should create a credit note referencing an invoice", async () => {
		const { caller } = ctx;

		const invoice = await caller.commercialDocument.create({
			documentType: "invoice",
			issueDate: new Date().toISOString().split("T")[0],
			customerId: defaultCustomer.id,
			lines: [
				{
					productId: testProduct.id,
					description: testProduct.name,
					quantity: 1,
					uomCode: testProduct.baseUom,
					unitPrice: 100,
					taxPercent: 15,
				},
			],
		});

		const creditNote = await caller.commercialDocument.create({
			documentType: "credit_note",
			issueDate: new Date().toISOString().split("T")[0],
			customerId: defaultCustomer.id,
			referenceDocumentId: invoice.result.document.id,
			reasonCode: "return",
			reasonDescription: "Producto defectuoso",
			lines: [
				{
					productId: testProduct.id,
					description: testProduct.name,
					quantity: 1,
					uomCode: testProduct.baseUom,
					unitPrice: 100,
					taxPercent: 15,
				},
			],
		});

		expect(creditNote.result.document.documentType).toBe("credit_note");
		expect(creditNote.result.document.documentNumber).toMatch(/^NC-/);
		expect(creditNote.result.document.referenceDocumentId).toBe(
			invoice.result.document.id,
		);
	});

	it.sequential("should generate sequential document numbers", async () => {
		const { caller } = ctx;

		const result1 = await caller.commercialDocument.generateNumber({
			documentType: "invoice",
			series: "001",
		});

		const result2 = await caller.commercialDocument.generateNumber({
			documentType: "invoice",
			series: "001",
		});

		expect(result1.result.number + 1).toBe(result2.result.number);
	});

	it.sequential("should list documents with filters", async () => {
		const { caller } = ctx;

		const result = await caller.commercialDocument.list({
			documentType: "invoice",
			customerId: defaultCustomer.id,
		});

		expect(result.documents).toBeDefined();
		expect(result.pagination).toBeDefined();
	});

	it.sequential("should get document by ID with lines", async () => {
		const { caller } = ctx;

		const created = await caller.commercialDocument.create({
			documentType: "invoice",
			issueDate: new Date().toISOString().split("T")[0],
			customerId: defaultCustomer.id,
			lines: [
				{
					productId: testProduct.id,
					description: testProduct.name,
					quantity: 1,
					uomCode: testProduct.baseUom,
					unitPrice: 100,
				},
			],
		});

		const result = await caller.commercialDocument.getById({
			id: created.result.document.id,
		});

		expect(result.result.document.id).toBe(created.result.document.id);
		expect(result.result.lines).toHaveLength(1);
	});

	it.sequential("should update document status", async () => {
		const { caller } = ctx;

		const created = await caller.commercialDocument.create({
			documentType: "invoice",
			issueDate: new Date().toISOString().split("T")[0],
			customerId: defaultCustomer.id,
			lines: [
				{
					productId: testProduct.id,
					description: testProduct.name,
					quantity: 1,
					uomCode: testProduct.baseUom,
					unitPrice: 100,
				},
			],
		});

		const updated = await caller.commercialDocument.update({
			id: created.result.document.id,
			status: "issued",
		});

		expect(updated.result.status).toBe("issued");
	});
});
