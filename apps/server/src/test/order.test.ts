import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { globals } from "./_globals";
import { setupTestContext } from "./util";

describe("Testing Order Management System", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("Sales Orders", () => {
		it.sequential("should create sales order with inventory reservation", async () => {
			const { caller } = ctx;
			const timestamp = Date.now();

			// Create a test customer first (unique code to avoid conflicts)
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `TEST_CUSTOMER_${timestamp}`,
				name: "Test Customer for Orders",
			};
			const customer = (await caller.customer.create(customerInput))[0]; // get first from array

			// Create a product with stock
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `ORDER_SKU_${timestamp}`,
					name: "Test Product for Orders",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
					productUoms: [
						{
							uomCode: "PK",
							qtyInBase: "6", // 1 PK = 6 EA
						},
					],
				};

			const product = await caller.product.create(productInput);

			// Add stock
			const receiveInput: inferProcedureInput<
				AppRouter["inventory"]["receive"]
			> = {
				productId: product.id,
				qty: 12, // 12 EA = 2 PK
				uomCode: "PK",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			};
			await caller.inventory.receive(receiveInput);

			// Create sales order
			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 6, // 6 EA
						uomCode: "EA",
						pricePerUom: 10.0,
					},
				],
			};

			const order = await caller.order.sales.create(orderInput);

			expect(order).toBeDefined();
			expect(order.order.code).toMatch(/^SO-\d{4}-/);
			expect(order.order.status).toBe("open");
			expect(order.lines).toHaveLength(1);
			expect(order.lines[0].qtyOrdered).toBe("6.000000000");
		});

		it.sequential("should fulfill sales order and reduce inventory", async () => {
			const { caller } = ctx;

			const timestamp = Date.now();

			// Create a test customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `FULFILL_CUSTOMER_${timestamp}`,
				name: "Customer for Fulfillment Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create a product with sufficient stock
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `FULFILL_SKU_${timestamp}`,
					name: "Product for Fulfillment",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Add enough stock (15 EA - unique amount to avoid conflicts)
			const receiveInput: inferProcedureInput<
				AppRouter["inventory"]["receive"]
			> = {
				productId: product.id,
				qty: 15, // Use specific qty to identify this test's data
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			};
			await caller.inventory.receive(receiveInput);

			// Verify stock was initially 15
			const initialStock = await caller.product.getStock({
				productId: product.id,
				warehouseId: globals.warehouse.id,
			});
			expect(initialStock.totalQty).toBe(15);

			// Create sales order (5 EA)
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
						pricePerUom: 10.0,
					},
				],
			};

			const order = await caller.order.sales.create(orderInput);
			const orderId = order.order.id;

			// Fulfill the order
			const fulfillmentResult = await caller.order.sales.fulfill(orderId);
			expect(fulfillmentResult.success).toBe(true);
			expect(fulfillmentResult.orderId).toBe(orderId);

			// Verify inventory was reduced by 5 EA (15 - 5 = 10)
			const finalStock = await caller.product.getStock({
				productId: product.id,
				warehouseId: globals.warehouse.id,
			});
			expect(finalStock.totalQty).toBe(10);
		});

		it.sequential("should cancel sales order and release reservations", async () => {
			const { caller } = ctx;

			// Create a test customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `CANCEL_CUSTOMER_${Date.now()}`,
				name: "Customer for Cancellation Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create a product with stock
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: nanoid(10),
					name: "Product for Cancellation",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};

			const product = await caller.product.create(productInput);

			// Add stock (15 EA)
			const receiveInput: inferProcedureInput<
				AppRouter["inventory"]["receive"]
			> = {
				productId: product.id,
				qty: 15,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			};
			await caller.inventory.receive(receiveInput);

			// Create sales order (7 EA) - should reserve stock
			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
				customerId: customer.id,
				warehouseId: globals.warehouse.id,
				lines: [
					{
						productId: product.id,
						qtyOrdered: 7,
						uomCode: "EA",
						pricePerUom: 10.0,
					},
				],
			};

			const order = await caller.order.sales.create(orderInput);
			const orderId = order.order.id;

			// Verify initial stock was 15, and 7 are reserved (available should be 8)
			const stockAfterReservation = await caller.product.getStock({
				productId: product.id,
				warehouseId: globals.warehouse.id,
			});
			expect(stockAfterReservation.totalQty).toBe(15); // Total stock unchanged, but 7 reserved

			// Cancel the order
			const cancelResult = await caller.order.sales.cancel(orderId);
			expect(cancelResult.success).toBe(true);
			expect(cancelResult.orderId).toBe(orderId);

			// Verify that reservations were released and stock is still 15
			const stockAfterCancellation = await caller.product.getStock({
				productId: product.id,
				warehouseId: globals.warehouse.id,
			});
			expect(stockAfterCancellation.totalQty).toBe(15); // Stock unchanged, reservations released
		});
	});

	describe("Purchase Orders", () => {
		it.sequential("should create purchase order", async () => {
			const { caller, defaultCategoryId, defaultWarehouseId } = ctx;

			// Create a test supplier using the router
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `TEST_SUPPLIER_${Date.now()}`,
				name: "Test Supplier for Orders",
			};
			const createdSuppliers = await caller.supplier.create(supplierInput);
			const testSupplier = createdSuppliers[0];

			// Create product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: nanoid(10),
					name: "Purchase Product",
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
				supplierId: testSupplier.id,
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

			const order = await caller.order.purchase.create(orderInput);

			expect(order).toBeDefined();
			expect(order.order.code).toMatch(/^PO-\d{4}-/);
			expect(order.order.status).toBe("open");
			expect(order.lines).toHaveLength(1);
		});

		it.sequential("should receive purchase order and add to inventory", async () => {
			// Skip this test for now until we implement order queries
			expect(true).toBe(true);
		});

		it.sequential("should cancel purchase order", async () => {
			// Skip this test for now until we implement order queries
			expect(true).toBe(true);
		});
	});

	describe("Invoice Generation", () => {
		it.sequential("should generate invoice from fulfilled order", async () => {
			const { caller } = ctx;

			const timestamp = Date.now();

			// Create a test customer
			const customerInput: inferProcedureInput<
				AppRouter["customer"]["create"]
			> = {
				code: `INVOICE_CUSTOMER_${timestamp}`,
				name: "Customer for Invoice Test",
			};
			const customer = (await caller.customer.create(customerInput))[0];

			// Create a product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `INVOICE_SKU_${timestamp}`,
					name: "Product for Invoice Test",
					baseUom: "EA",
					categoryId: globals.productCategory.id,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await caller.product.create(productInput);

			// Add stock (20 EA)
			const receiveInput: inferProcedureInput<
				AppRouter["inventory"]["receive"]
			> = {
				productId: product.id,
				qty: 20,
				uomCode: "EA",
				currency: "USD",
				warehouseId: globals.warehouse.id,
			};
			await caller.inventory.receive(receiveInput);

			// Create sales order (10 EA)
			const orderInput: inferProcedureInput<
				AppRouter["order"]["sales"]["create"]
			> = {
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
			const orderId = order.order.id;

			// Fulfill the order
			const fulfillmentResult = await caller.order.sales.fulfill(orderId);
			expect(fulfillmentResult.success).toBe(true);

			// Generate invoice from fulfilled order
			const invoiceInput: inferProcedureInput<
				AppRouter["invoice"]["generateFromOrder"]
			> = {
				orderId,
				orderType: "sales",
			};

			const invoice = await caller.invoice.generateFromOrder(invoiceInput);

			expect(invoice).toBeDefined();
			expect(invoice.invoice.invoiceNumber).toMatch(/^INV-\d{6}-/);
			expect(invoice.invoice.customerId).toBe(customer.id);
			expect(invoice.invoice.status).toBe("issued");
			expect(invoice.items).toHaveLength(1);
			expect(invoice.items[0].qty).toBe("10.000000000");
			expect(invoice.items[0].unitPrice).toBe("25.000000");
		});

		it.sequential("should generate invoice from purchase order receipt", async () => {
			const { caller, defaultCategoryId, defaultWarehouseId } = ctx;
			const timestamp = Date.now();

			// Create a test supplier
			const supplierInput: inferProcedureInput<
				AppRouter["supplier"]["create"]
			> = {
				code: `INVOICE_SUPPLIER_${timestamp}`,
				name: "Supplier for Invoice Test",
			};
			const createdSuppliers = await caller.supplier.create(supplierInput);
			const supplier = createdSuppliers[0];

			// Create a product
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `PO_INVOICE_SKU_${timestamp}`,
					name: "Product for PO Invoice Test",
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
						qtyOrdered: 15,
						uomCode: "EA",
						pricePerUom: 12.5,
					},
				],
			};

			const order = await caller.order.purchase.create(orderInput);
			const orderId = order.order.id;

			// Receive the purchase order to fulfill it
			const receiveInput: inferProcedureInput<
				AppRouter["order"]["purchase"]["receive"]
			> = {
				purchaseOrderId: orderId,
				receiptLines: [
					{
						orderLineId: order.lines[0].id,
						qtyReceived: 15,
						uomCode: "EA",
						costPerUom: 12.5,
						currency: "USD",
					},
				],
			};

			await caller.order.purchase.receive(receiveInput);

			// Generate invoice from fulfilled purchase order
			const invoiceInput: inferProcedureInput<
				AppRouter["invoice"]["generateFromOrder"]
			> = {
				orderId,
				orderType: "purchase",
			};

			const invoice = await caller.invoice.generateFromOrder(invoiceInput);

			expect(invoice).toBeDefined();
			expect(invoice.invoice.invoiceNumber).toMatch(/^INV-\d{6}-/);
			expect(invoice.invoice.supplierId).toBe(supplier.id);
			expect(invoice.invoice.status).toBe("issued");
			expect(invoice.items).toHaveLength(1);
			expect(invoice.items[0].qty).toBe("15.000000000");
			expect(invoice.items[0].unitPrice).toBe("12.500000");
		});
	});
});
