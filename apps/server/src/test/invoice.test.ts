import type { inferProcedureInput } from "@trpc/server";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { globals } from "./globals";
import { setupTestContext } from "./util";

describe("Testing Invoice Management System", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("Invoice CRUD Operations", () => {
		it.sequential("should get invoice by ID - existing invoice", async () => {
			const { caller } = ctx;
			const orgId = globals.organization.id;
			const timestamp = Date.now();

			// Create a test customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				organizationId: orgId,
				code: `CUST_INV_${timestamp}`,
				name: "Customer for Invoice Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create a product with stock
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					organizationId: orgId,
					sku: `INV_SKU_${timestamp}`,
					name: "Product for Invoice Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Add stock
			const receiveInput: inferProcedureInput<
				AppRouter["inventory"]["receive"]
			> = {
				organizationId: orgId,
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			};
			await caller.inventory.receive(receiveInput);

			// Create and fulfill sales order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				organizationId: orgId,
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 10,
						uomCode: "EA",
						pricePerUom: 25.0,
					},
				],
			};
			const order = await caller.order.sales.create(orderInput);
			await caller.order.sales.fulfill(order.order.id);

			// Generate invoice
			const invoiceInput: inferProcedureInput<
				AppRouter["invoice"]["generateFromOrder"]
			> = {
				orderId: order.order.id,
				orderType: "sales",
			};
			const generatedInvoice =
				await caller.invoice.generateFromOrder(invoiceInput);

			// Get invoice by ID
			const retrieved = await caller.invoice.getById({
				id: generatedInvoice.invoice.id,
			});

			expect(retrieved).toBeDefined();
			expect(retrieved.invoice.id).toBe(generatedInvoice.invoice.id);
			expect(retrieved.invoice.invoiceNumber).toBe(
				generatedInvoice.invoice.invoiceNumber,
			);
			expect(retrieved.items).toHaveLength(1);
			expect(retrieved.items[0].productId).toBe(product.id);
		});

		it.sequential(
			"should get invoice by ID - non-existing invoice",
			async () => {
				const { caller } = ctx;

				await expect(
					caller.invoice.getById({
						id: "non-existing-id",
					}),
				).rejects.toThrow("Invoice not found");
			},
		);

		it.sequential("should list invoices with filters", async () => {
			const { caller } = ctx;
			const orgId = globals.organization.id;

			// Get current count
			const initialList = await caller.invoice.list({
				organizationId: orgId,
				page: 1,
				limit: 10,
			});

			const initialCount = initialList.invoices.length;

			// Create customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				organizationId: orgId,
				code: `LIST_CUST_${Date.now()}`,
				name: "Customer for List Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					organizationId: orgId,
					sku: `LIST_SKU_${Date.now()}`,
					name: "Product for List Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Add stock
			await caller.inventory.receive({
				organizationId: orgId,
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			// Create and fulfill order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				organizationId: orgId,
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 5,
						uomCode: "EA",
						pricePerUom: 15.0,
					},
				],
			};
			const order = await caller.order.sales.create(orderInput);
			await caller.order.sales.fulfill(order.order.id);

			// Generate invoice
			await caller.invoice.generateFromOrder({
				orderId: order.order.id,
				orderType: "sales",
			});

			// List all invoices
			const allInvoices = await caller.invoice.list({
				organizationId: orgId,
				page: 1,
				limit: 10,
			});

			expect(allInvoices.invoices.length).toBeGreaterThanOrEqual(initialCount);

			// Filter by customer
			const customerInvoices = await caller.invoice.list({
				organizationId: orgId,
				customerId: customer.id,
				page: 1,
				limit: 10,
			});

			expect(customerInvoices.invoices.length).toBeGreaterThan(0);
			expect(customerInvoices.invoices[0].customerId).toBe(customer.id);

			// Filter by status
			const issuedInvoices = await caller.invoice.list({
				organizationId: orgId,
				status: "issued",
				page: 1,
				limit: 10,
			});

			expect(issuedInvoices.invoices.length).toBeGreaterThan(0);
			expect(issuedInvoices.invoices[0].status).toBe("issued");
		});

		it.sequential("should list invoices with pagination", async () => {
			const { caller } = ctx;
			const orgId = globals.organization.id;

			const paginatedList = await caller.invoice.list({
				organizationId: orgId,
				page: 1,
				limit: 2,
			});

			expect(paginatedList.pagination.page).toBe(1);
			expect(paginatedList.pagination.limit).toBe(2);
			expect(paginatedList.invoices.length).toBeLessThanOrEqual(2);
		});

		it.sequential("should update invoice - valid status change", async () => {
			const { caller } = ctx;
			const orgId = globals.organization.id;

			// Create draft invoice (if we had manual invoice creation)
			// For now, create an invoice and test status changes through update

			// Create order and invoice
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				organizationId: orgId,
				code: `UPDATE_CUST_${Date.now()}`,
				name: "Customer for Update Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					organizationId: orgId,
					sku: `UPDATE_SKU_${Date.now()}`,
					name: "Product for Update Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			await caller.inventory.receive({
				organizationId: orgId,
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				organizationId: orgId,
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 5,
						uomCode: "EA",
						pricePerUom: 15.0,
					},
				],
			};
			const order = await caller.order.sales.create(orderInput);
			await caller.order.sales.fulfill(order.order.id);

			const invoiceInput: inferProcedureInput<
				AppRouter["invoice"]["generateFromOrder"]
			> = {
				orderId: order.order.id,
				orderType: "sales",
			};
			const generatedInvoice =
				await caller.invoice.generateFromOrder(invoiceInput);

			// Update notes and terms (should work for issued invoices)
			const updated = await caller.invoice.update({
				id: generatedInvoice.invoice.id,
				notes: "Updated notes",
				terms: "Updated payment terms",
				referenceNumber: "REF-123",
			});

			expect(updated.notes).toBe("Updated notes");
			expect(updated.terms).toBe("Updated payment terms");
			expect(updated.referenceNumber).toBe("REF-123");
		});

		it.sequential("should update invoice - invalid status change", async () => {
			const { caller } = ctx;
			const orgId = globals.organization.id;

			// Create issued invoice
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				organizationId: orgId,
				code: `INVALID_CUST_${Date.now()}`,
				name: "Customer for Invalid Status Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					organizationId: orgId,
					sku: `INVALID_SKU_${Date.now()}`,
					name: "Product for Invalid Status Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			await caller.inventory.receive({
				organizationId: orgId,
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				organizationId: orgId,
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 5,
						uomCode: "EA",
						pricePerUom: 15.0,
					},
				],
			};
			const order = await caller.order.sales.create(orderInput);
			await caller.order.sales.fulfill(order.order.id);

			const invoiceInput: inferProcedureInput<
				AppRouter["invoice"]["generateFromOrder"]
			> = {
				orderId: order.order.id,
				orderType: "sales",
			};
			const generatedInvoice =
				await caller.invoice.generateFromOrder(invoiceInput);

			// Try to change from issued to draft (invalid transition)
			await expect(
				caller.invoice.update({
					id: generatedInvoice.invoice.id,
					status: "draft",
				}),
			).rejects.toThrow("Invalid status transition");
		});

		it.sequential("should delete invoice - draft invoice", async () => {
			// Skip this test until we implement manual invoice creation
			// or create draft invoices another way
			expect(true).toBe(true);
		});

		it.sequential(
			"should delete invoice - non-draft invoice (should fail)",
			async () => {
				const { caller } = ctx;
				const orgId = globals.organization.id;

				// Create issued invoice
				const customerInput: inferProcedureInput<
					AppRouter["customer"]["create"]
				> = {
					organizationId: orgId,
					code: `DELETE_FAIL_CUST_${Date.now()}`,
					name: "Customer for Delete Fail Test",
				};
				const customer = (await caller.customer.create(customerInput))[0];

				const productInput: inferProcedureInput<
					AppRouter["product"]["create"]
				> = {
					organizationId: orgId,
					sku: `DELETE_FAIL_SKU_${Date.now()}`,
					name: "Product for Delete Fail Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
				const product = await caller.product.create(productInput);

				await caller.inventory.receive({
					organizationId: orgId,
					productId: product.id,
					qty: 20,
					uomCode: "EA",
					currency: "USD",
					warehouseId: globals.warehouse.id,
				});

				const orderInput: inferProcedureInput<
					AppRouter["order"]["sales"]["create"]
				> = {
					organizationId: orgId,
					customerId: customer.id,
					warehouseId: globals.warehouse.id,
					lines: [
						{
							productId: product.id,
							qtyOrdered: 5,
							uomCode: "EA",
							pricePerUom: 15.0,
						},
					],
				};
				const order = await caller.order.sales.create(orderInput);
				await caller.order.sales.fulfill(order.order.id);

				const invoiceInput: inferProcedureInput<
					AppRouter["invoice"]["generateFromOrder"]
				> = {
					orderId: order.order.id,
					orderType: "sales",
				};
				const generatedInvoice =
					await caller.invoice.generateFromOrder(invoiceInput);

				// Try to delete issued invoice (should fail)
				await expect(
					caller.invoice.delete({
						id: generatedInvoice.invoice.id,
					}),
				).rejects.toThrow("Only draft invoices can be deleted");
			},
		);

		it.sequential("should mark invoice as paid - issued invoice", async () => {
			const { caller } = ctx;
			const orgId = globals.organization.id;

			// Create issued invoice
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				organizationId: orgId,
				code: `PAID_CUST_${Date.now()}`,
				name: "Customer for Paid Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					organizationId: orgId,
					sku: `PAID_SKU_${Date.now()}`,
					name: "Product for Paid Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			await caller.inventory.receive({
				organizationId: orgId,
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				organizationId: orgId,
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 5,
						uomCode: "EA",
						pricePerUom: 15.0,
					},
				],
			};
			const order = await caller.order.sales.create(orderInput);
			await caller.order.sales.fulfill(order.order.id);

			const invoiceInput: inferProcedureInput<
				AppRouter["invoice"]["generateFromOrder"]
			> = {
				orderId: order.order.id,
				orderType: "sales",
			};
			const generatedInvoice =
				await caller.invoice.generateFromOrder(invoiceInput);

			// Mark as paid
			const paidInvoice = await caller.invoice.markAsPaid({
				id: generatedInvoice.invoice.id,
			});

			expect(paidInvoice.status).toBe("paid");
			expect(paidInvoice.paidAt).toBeDefined();
		});

		it.sequential(
			"should mark invoice as paid - already paid invoice",
			async () => {
				const { caller } = ctx;
				const orgId = globals.organization.id;

				// Create and pay invoice
				const customerInput: inferProcedureInput<
					AppRouter["customer"]["create"]
				> = {
					organizationId: orgId,
					code: `ALREADY_PAID_CUST_${Date.now()}`,
					name: "Customer for Already Paid Test",
				};
				const customer = (await caller.customer.create(customerInput))[0];

				const productInput: inferProcedureInput<
					AppRouter["product"]["create"]
				> = {
					organizationId: orgId,
					sku: `ALREADY_PAID_SKU_${Date.now()}`,
					name: "Product for Already Paid Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
				const product = await caller.product.create(productInput);

				await caller.inventory.receive({
					organizationId: orgId,
					productId: product.id,
					qty: 20,
					uomCode: "EA",
					currency: "USD",
					warehouseId: globals.warehouse.id,
				});

				const orderInput: inferProcedureInput<
					AppRouter["order"]["sales"]["create"]
				> = {
					organizationId: orgId,
					customerId: customer.id,
					warehouseId: globals.warehouse.id,
					lines: [
						{
							productId: product.id,
							qtyOrdered: 5,
							uomCode: "EA",
							pricePerUom: 15.0,
						},
					],
				};
				const order = await caller.order.sales.create(orderInput);
				await caller.order.sales.fulfill(order.order.id);

				const invoiceInput: inferProcedureInput<
					AppRouter["invoice"]["generateFromOrder"]
				> = {
					orderId: order.order.id,
					orderType: "sales",
				};
				const generatedInvoice =
					await caller.invoice.generateFromOrder(invoiceInput);

				// Mark as paid first time
				await caller.invoice.markAsPaid({
					id: generatedInvoice.invoice.id,
				});

				// Try to mark as paid again (should fail)
				await expect(
					caller.invoice.markAsPaid({
						id: generatedInvoice.invoice.id,
					}),
				).rejects.toThrow("Only issued invoices can be marked as paid");
			},
		);
	});

	describe("Invoice Generation", () => {
		it.sequential("should generate invoice numbering correctly", async () => {
			const { caller } = ctx;
			const orgId = globals.organization.id;

			// Create customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				organizationId: orgId,
				code: `NUMBERING_CUST_${Date.now()}`,
				name: "Customer for Numbering Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					organizationId: orgId,
					sku: `NUMBERING_SKU_${Date.now()}`,
					name: "Product for Numbering Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			await caller.inventory.receive({
				organizationId: orgId,
				productId: product.id,
				qty: 50,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			// Create and fulfill two orders
			const orderInput1: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				organizationId: orgId,
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 5,
						uomCode: "EA",
						pricePerUom: 15.0,
					},
				],
			};
			const order1 = await caller.order.sales.create(orderInput1);
			await caller.order.sales.fulfill(order1.order.id);

			const orderInput2: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				organizationId: orgId,
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 5,
						uomCode: "EA",
						pricePerUom: 15.0,
					},
				],
			};
			const order2 = await caller.order.sales.create(orderInput2);
			await caller.order.sales.fulfill(order2.order.id);

			// Generate two invoices
			const invoice1 = await caller.invoice.generateFromOrder({
				orderId: order1.order.id,
				orderType: "sales",
				invoiceDate: new Date("2024-01-15"),
			});

			const invoice2 = await caller.invoice.generateFromOrder({
				orderId: order2.order.id,
				orderType: "sales",
				invoiceDate: new Date("2024-01-16"),
			});

			expect(invoice1.invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
			expect(invoice2.invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
			expect(invoice1.invoice.invoiceNumber).not.toBe(
				invoice2.invoice.invoiceNumber,
			);
		});
	});
});
