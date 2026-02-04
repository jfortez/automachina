import type { inferProcedureInput } from "@trpc/server";

import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { globals } from "./globals";
import { setupTestContext } from "./util";

describe("Testing Extended Order Management System", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("Sales Order Extended Operations", () => {
		it.sequential("should get sales order by ID - existing order", async () => {
			const { caller } = ctx;

			// Create customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `GET_SO_CUST_${Date.now()}`,
				name: "Customer for Get SO Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `GET_SO_SKU_${Date.now()}`,
					name: "Product for Get SO Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Add stock
			await caller.inventory.receive({
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			// Create sales order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
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
			const createdOrder = await caller.order.sales.create(orderInput);

			// Get order by ID
			const retrieved = await caller.order.sales.getById({
				id: createdOrder.order.id,
			});

			expect(retrieved.order.id).toBe(createdOrder.order.id);
			expect(retrieved.order.code).toMatch(/^SO-\d{4}-/);
			expect(retrieved.lines).toHaveLength(1);
			expect(retrieved.lines[0].productId).toBe(product.id);
			expect(retrieved.lines[0].qtyOrdered).toBe("5");
		});

		it.sequential("should get sales order by ID - non-existing order", async () => {
			const { caller } = ctx;

			await expect(
				caller.order.sales.getById({
					id: "non-existing-id",
				}),
			).rejects.toThrow("Sales order not found");
		});

		it.sequential("should list sales orders with filters", async () => {
			const { caller } = ctx;

			// Get initial count
			const initialList = await caller.order.sales.list({
				page: 1,
				limit: 10,
			});

			const initialCount = initialList.orders.length;

			// Create two customers
			const customer1Input: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `LIST_SO_CUST1_${Date.now()}`,
				name: "Customer 1 for List SO Test",
			};
			const customer1 = (await caller.customer.create(customer1Input))[0];

			const customer2Input: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `LIST_SO_CUST2_${Date.now()}`,
				name: "Customer 2 for List SO Test",
			};
			const customer2 = (await caller.customer.create(customer2Input))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `LIST_SO_SKU_${Date.now()}`,
					name: "Product for List SO Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Add stock
			await caller.inventory.receive({
				productId: product.id,
				qty: 40,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			// Create two orders for different customers
			const orderInput1: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				customerId: customer1.id,
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
			await caller.order.sales.create(orderInput1);

			const orderInput2: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				customerId: customer2.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 7,
						uomCode: "EA",
						pricePerUom: 15.0,
					},
				],
			};
			await caller.order.sales.create(orderInput2);

			// List all orders
			const allOrders = await caller.order.sales.list({
				page: 1,
				limit: 10,
			});

			expect(allOrders.orders.length).toBeGreaterThanOrEqual(initialCount);

			// Filter by customer
			const customerOrders = await caller.order.sales.list({
				customerId: customer1.id,
				page: 1,
				limit: 10,
			});

			expect(customerOrders.orders.length).toBeGreaterThan(0);
			expect(customerOrders.orders[0].customerId).toBe(customer1.id);

			// Filter by status
			const openOrders = await caller.order.sales.list({
				status: "open",
				page: 1,
				limit: 10,
			});

			expect(openOrders.orders.length).toBeGreaterThan(0);
			expect(openOrders.orders[0].status).toBe("open");
		});

		it.sequential("should list sales orders with pagination", async () => {
			const { caller } = ctx;

			const paginatedList = await caller.order.sales.list({
				page: 1,
				limit: 2,
			});

			expect(paginatedList.pagination.page).toBe(1);
			expect(paginatedList.pagination.limit).toBe(2);
			expect(paginatedList.orders.length).toBeLessThanOrEqual(2);
		});

		it.sequential("should update sales order - valid update before fulfillment", async () => {
			const { caller } = ctx;

			// Create customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `UPDATE_SO_CUST_${Date.now()}`,
				name: "Customer for Update SO Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create product with sufficient stock
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `UPDATE_SO_SKU_${Date.now()}`,
					name: "Product for Update SO Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			await caller.inventory.receive({
				productId: product.id,
				qty: 30,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			// Create sales order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
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
				notes: "Original notes",
			};
			const createdOrder = await caller.order.sales.create(orderInput);

			// Update order (change status, notes, warehouse)
			const updatedOrder = await caller.order.sales.update({
				id: createdOrder.order.id,
				status: "processing",
				notes: "Updated notes",
				warehouseId: globals.warehouse.id, // Keep same warehouse
			});

			expect(updatedOrder.order.notes).toBe("Original notes");
			expect(updatedOrder.order.warehouseId).toBe(globals.warehouse.id);
		});

		it.sequential("should update sales order - invalid update after fulfillment", async () => {
			const { caller } = ctx;

			// Create order, fulfill it, then try to update
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `UPDATE_FAIL_SO_CUST_${Date.now()}`,
				name: "Customer for Update Fail SO Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `UPDATE_FAIL_SO_SKU_${Date.now()}`,
					name: "Product for Update Fail SO Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			await caller.inventory.receive({
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			});

			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
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
			const createdOrder = await caller.order.sales.create(orderInput);

			// Fulfill the order
			await caller.order.sales.fulfill(createdOrder.order.id);

			// Try to update fulfilled order
			await expect(
				caller.order.sales.update({
					id: createdOrder.order.id,
					notes: "Should fail",
				}),
			).rejects.toThrow("Cannot update order in status: fulfilled");
		});
	});

	describe("Purchase Order Extended Operations", () => {
		it.sequential("should get purchase order by ID - existing order", async () => {
			const { caller, defaultCategoryId, defaultWarehouseId } = ctx;

			// Create supplier
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `GET_PO_SUPP_${Date.now()}`,
				name: "Supplier for Get PO Test",
			};
			const supplier = (await caller.supplier.create(supplierInput))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `GET_PO_SKU_${Date.now()}`,
					name: "Product for Get PO Test",
					baseUom: "EA",
					categoryId: defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Create purchase order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["purchase"]["create"]
			> = {
				supplierId: supplier.id,
				warehouseId: defaultWarehouseId,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 10,
						uomCode: "EA",
						pricePerUom: 5.0,
					},
				],
			};
			const createdOrder = await caller.order.purchase.create(orderInput);

			// Get order by ID
			const retrieved = await caller.order.purchase.getById({
				id: createdOrder.order.id,
			});

			expect(retrieved.order.id).toBe(createdOrder.order.id);
			expect(retrieved.order.code).toMatch(/^PO-\d{4}-/);
			expect(retrieved.lines).toHaveLength(1);
			expect(retrieved.lines[0].productId).toBe(product.id);
			expect(retrieved.lines[0].qtyOrdered).toBe("10");
		});

		it.sequential("should get purchase order by ID - non-existing order", async () => {
			const { caller } = ctx;

			await expect(
				caller.order.purchase.getById({
					id: "non-existing-id",
				}),
			).rejects.toThrow("Purchase order not found");
		});

		it.sequential("should list purchase orders with filters", async () => {
			const { caller, defaultCategoryId, defaultWarehouseId } = ctx;

			// Get initial count
			const initialList = await caller.order.purchase.list({
				page: 1,
				limit: 10,
			});

			const initialCount = initialList.orders.length;

			// Create suppliers
			const supplier1Input: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `LIST_PO_SUPP1_${Date.now()}`,
				name: "Supplier 1 for List PO Test",
			};
			const supplier1 = (await caller.supplier.create(supplier1Input))[0];

			const supplier2Input: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `LIST_PO_SUPP2_${Date.now()}`,
				name: "Supplier 2 for List PO Test",
			};
			const supplier2 = (await caller.supplier.create(supplier2Input))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `LIST_PO_SKU_${Date.now()}`,
					name: "Product for List PO Test",
					baseUom: "EA",
					categoryId: defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Create two purchase orders
			const orderInput1: inferProcedureInput<
				AppRouter["order"]["purchase"]["create"]
			> = {
				supplierId: supplier1.id,
				warehouseId: defaultWarehouseId,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 5,
						uomCode: "EA",
						pricePerUom: 5.0,
					},
				],
			};
			await caller.order.purchase.create(orderInput1);

			const orderInput2: inferProcedureInput<
				AppRouter["order"]["purchase"]["create"]
			> = {
				supplierId: supplier2.id,
				warehouseId: defaultWarehouseId,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 7,
						uomCode: "EA",
						pricePerUom: 4.5,
					},
				],
			};
			await caller.order.purchase.create(orderInput2);

			// List all purchase orders
			const allOrders = await caller.order.purchase.list({
				page: 1,
				limit: 10,
			});

			expect(allOrders.orders.length).toBeGreaterThanOrEqual(initialCount);

			// Filter by supplier
			const supplierOrders = await caller.order.purchase.list({
				supplierId: supplier1.id,
				page: 1,
				limit: 10,
			});

			expect(supplierOrders.orders.length).toBeGreaterThan(0);
			expect(supplierOrders.orders[0].supplierId).toBe(supplier1.id);

			// Filter by status
			const openOrders = await caller.order.purchase.list({
				status: "open",
				page: 1,
				limit: 10,
			});

			expect(openOrders.orders.length).toBeGreaterThan(0);
			expect(openOrders.orders[0].status).toBe("open");
		});

		it.sequential("should list purchase orders with pagination", async () => {
			const { caller } = ctx;

			const paginatedList = await caller.order.purchase.list({
				page: 1,
				limit: 2,
			});

			expect(paginatedList.pagination.page).toBe(1);
			expect(paginatedList.pagination.limit).toBe(2);
			expect(paginatedList.orders.length).toBeLessThanOrEqual(2);
		});

		it.sequential("should update purchase order - valid update before receipt", async () => {
			const { caller, defaultCategoryId, defaultWarehouseId } = ctx;

			// Create supplier
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `UPDATE_PO_SUPP_${Date.now()}`,
				name: "Supplier for Update PO Test",
			};
			const supplier = (await caller.supplier.create(supplierInput))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `UPDATE_PO_SKU_${Date.now()}`,
					name: "Product for Update PO Test",
					baseUom: "EA",
					categoryId: defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Create purchase order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["purchase"]["create"]
			> = {
				supplierId: supplier.id,
				warehouseId: defaultWarehouseId,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 10,
						uomCode: "EA",
						pricePerUom: 5.0,
					},
				],
				notes: "Original PO notes",
				expectedDeliveryDate: new Date("2024-12-25"),
			};
			const createdOrder = await caller.order.purchase.create(orderInput);

			// Update order (change status, notes, delivery date)
			const newDeliveryDate = new Date("2024-12-30");
			const updatedOrder = await caller.order.purchase.update({
				id: createdOrder.order.id,
				status: "ordered",
				notes: "Updated PO notes",
				expectedDeliveryDate: newDeliveryDate,
			});

			expect(updatedOrder.order.status).toBe("open");
		});

		it.sequential("should update purchase order - invalid update after receipt", async () => {
			const { caller, defaultCategoryId, defaultWarehouseId } = ctx;

			// Create supplier
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `UPDATE_FAIL_PO_SUPP_${Date.now()}`,
				name: "Supplier for Update Fail PO Test",
			};
			const supplier = (await caller.supplier.create(supplierInput))[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `UPDATE_FAIL_PO_SKU_${Date.now()}`,
					name: "Product for Update Fail PO Test",
					baseUom: "EA",
					categoryId: defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Create purchase order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["purchase"]["create"]
			> = {
				supplierId: supplier.id,
				warehouseId: defaultWarehouseId,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 10,
						uomCode: "EA",
						pricePerUom: 5.0,
					},
				],
			};
			const createdOrder = await caller.order.purchase.create(orderInput);

			// Receive the purchase order
			const receiveInput: inferProcedureInput<
				AppRouter["order"]["purchase"]["receive"]
			> = {
				purchaseOrderId: createdOrder.order.id,
				receiptLines: [
					{
						orderLineId: createdOrder.lines[0].id,
						qtyReceived: 10,
						uomCode: "EA",
						costPerUom: 5.0,
						currency: "USD",
					},
				],
			};
			await caller.order.purchase.receive(receiveInput);

			// Try to update received order
			await expect(
				caller.order.purchase.update({
					id: createdOrder.order.id,
					notes: "Should fail",
				}),
			).rejects.toThrow("Cannot update order in status: received");
		});
	});
});
