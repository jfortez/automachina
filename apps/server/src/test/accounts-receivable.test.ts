import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { formatNumeric, setupTestContext } from "./util";

describe("Accounts Receivable Management", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let testCustomer: { id: string; name: string; code: string };
	let testAR: { id: string; documentNumber: string };
	let testPayment: { id: string; paymentNumber: string };

	beforeAll(async () => {
		ctx = await setupTestContext();

		const customerInput: inferProcedureInput<AppRouter["customer"]["create"]> =
			{
				code: `test-cust-${nanoid(8)}`,
				name: "Test AR Customer",
			};

		const [createdCustomer] = await ctx.caller.customer.create(customerInput);
		testCustomer = {
			id: createdCustomer.id,
			name: createdCustomer.name,
			code: createdCustomer.code,
		};
	});

	describe("Account Receivable CRUD", () => {
		it.sequential("should create an account receivable", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["create"]
			> = {
				documentNumber: `INV-${nanoid(8)}`,
				documentType: "invoice",
				customerId: testCustomer.id,
				originalAmount: 1000.0,
				amountRemaining: 1000.0,
				documentDate: new Date().toISOString(),
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				description: "Test invoice for AR",
			};

			const { result } = await ctx.caller.accountsReceivable.create(input);

			expect(result).toBeDefined();
			expect(result.documentNumber).toBe(input.documentNumber);
			expect(result.customerId).toBe(testCustomer.id);
			expect(result.originalAmount).toBe(formatNumeric(1000.0, 2));
			expect(result.amountRemaining).toBe(formatNumeric(1000.0, 2));
			expect(result.status).toBe("open");

			testAR = { id: result.id, documentNumber: result.documentNumber };
		});

		it.sequential("should not allow duplicate document numbers", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["create"]
			> = {
				documentNumber: testAR.documentNumber,
				documentType: "invoice",
				customerId: testCustomer.id,
				originalAmount: 500.0,
				amountRemaining: 500.0,
				documentDate: new Date().toISOString(),
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			};

			await expect(ctx.caller.accountsReceivable.create(input)).rejects.toThrow(
				/already exists/,
			);
		});

		it.sequential("should get AR by ID", async () => {
			const { result } = await ctx.caller.accountsReceivable.getById({
				id: testAR.id,
			});

			expect(result).toBeDefined();
			expect(result.id).toBe(testAR.id);
			expect(result.customerId).toBe(testCustomer.id);
		});

		it.sequential("should update AR", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["update"]
			> = {
				id: testAR.id,
				status: "disputed",
				disputeReason: "Customer claims wrong quantity",
				isDisputed: true,
			};

			const { result } = await ctx.caller.accountsReceivable.update(input);

			expect(result).toBeDefined();
			expect(result.status).toBe("disputed");
			expect(result.isDisputed).toBe(true);
			expect(result.disputeReason).toBe("Customer claims wrong quantity");
		});

		it.sequential("should list ARs", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["list"]
			> = {
				customerId: testCustomer.id,
				page: 1,
				limit: 10,
			};

			const result = await ctx.caller.accountsReceivable.list(input);

			expect(result.items).toBeDefined();
			expect(result.items.length).toBeGreaterThan(0);
			expect(Number(result.total)).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Payments", () => {
		it.sequential("should create a payment with applications", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["createPayment"]
			> = {
				paymentNumber: `PAY-${nanoid(8)}`,
				paymentDate: new Date().toISOString(),
				customerId: testCustomer.id,
				paymentMethod: "bank_transfer",
				totalAmount: 500.0,
				notes: "Partial payment",
				applications: [
					{
						arId: testAR.id,
						amountApplied: 500.0,
					},
				],
			};

			const { result } =
				await ctx.caller.accountsReceivable.createPayment(input);

			expect(result).toBeDefined();
			expect(result.paymentNumber).toBe(input.paymentNumber);
			expect(result.totalAmount).toBe(formatNumeric(500.0, 2));
			expect(result.unappliedAmount).toBe(formatNumeric(0, 2));

			testPayment = { id: result.id, paymentNumber: result.paymentNumber };
		});

		it.sequential("should update AR balance after payment", async () => {
			const { result } = await ctx.caller.accountsReceivable.getById({
				id: testAR.id,
			});

			expect(result).toBeDefined();
			expect(result.amountPaid).toBe(formatNumeric(500.0, 2));
			expect(result.amountRemaining).toBe(formatNumeric(500.0, 2));
			expect(result.status).toBe("partial");
		});

		it.sequential("should list payments", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["listPayments"]
			> = {
				customerId: testCustomer.id,
				page: 1,
				limit: 10,
			};

			const result = await ctx.caller.accountsReceivable.listPayments(input);

			expect(result.items).toBeDefined();
			expect(result.items.length).toBeGreaterThan(0);
		});

		it.sequential("should get payment with applications", async () => {
			const { result } = await ctx.caller.accountsReceivable.getPayment({
				id: testPayment.id,
			});

			expect(result).toBeDefined();
			expect(result.applications).toBeDefined();
			expect(result.applications.length).toBe(1);
			expect(result.applications[0].arId).toBe(testAR.id);
		});
	});

	describe("Credit Memos", () => {
		let testCreditMemo: { id: string };

		it.sequential("should create a credit memo", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["createCreditMemo"]
			> = {
				documentNumber: `CM-${nanoid(8)}`,
				customerId: testCustomer.id,
				originalArId: testAR.id,
				reasonCode: "return",
				reasonDescription: "Product return",
				totalAmount: 200.0,
				documentDate: new Date().toISOString(),
			};

			const { result } =
				await ctx.caller.accountsReceivable.createCreditMemo(input);

			expect(result).toBeDefined();
			expect(result.documentNumber).toBe(input.documentNumber);
			expect(result.totalAmount).toBe(formatNumeric(200.0, 2));
			expect(result.remainingAmount).toBe(formatNumeric(200.0, 2));
			expect(result.status).toBe("open");

			testCreditMemo = { id: result.id };
		});

		it.sequential("should apply credit memo to AR", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["applyCreditMemo"]
			> = {
				creditMemoId: testCreditMemo.id,
				arId: testAR.id,
				amount: 200.0,
			};

			const { result } =
				await ctx.caller.accountsReceivable.applyCreditMemo(input);

			expect(result).toBeDefined();
			expect(result.success).toBe(true);
		});

		it.sequential("should update AR balance after credit memo", async () => {
			const { result } = await ctx.caller.accountsReceivable.getById({
				id: testAR.id,
			});

			expect(result).toBeDefined();
			expect(Number.parseFloat(result.amountRemaining)).toBeLessThanOrEqual(
				300,
			);
		});

		it.sequential("should list credit memos", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["listCreditMemos"]
			> = {
				customerId: testCustomer.id,
				page: 1,
				limit: 10,
			};

			const result = await ctx.caller.accountsReceivable.listCreditMemos(input);

			expect(result.items).toBeDefined();
			expect(result.items.length).toBeGreaterThan(0);
		});
	});

	describe("Collection Activities", () => {
		it.sequential("should create a collection activity", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["createCollectionActivity"]
			> = {
				customerId: testCustomer.id,
				arId: testAR.id,
				activityType: "phone_call",
				activityDate: new Date().toISOString(),
				contactName: "John Doe",
				contactMethod: "mobile",
				notes: "Customer promised to pay next week",
				promisedAmount: 300.0,
				promisedDate: new Date(
					Date.now() + 7 * 24 * 60 * 60 * 1000,
				).toISOString(),
			};

			const { result } =
				await ctx.caller.accountsReceivable.createCollectionActivity(input);

			expect(result).toBeDefined();
			expect(result.customerId).toBe(testCustomer.id);
			expect(result.activityType).toBe("phone_call");
			expect(result.promisedAmount).toBe(formatNumeric(300.0, 2));
		});

		it.sequential("should list collection activities", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["listCollectionActivities"]
			> = {
				customerId: testCustomer.id,
				page: 1,
				limit: 10,
			};

			const result =
				await ctx.caller.accountsReceivable.listCollectionActivities(input);

			expect(result.items).toBeDefined();
			expect(result.items.length).toBeGreaterThan(0);
		});
	});

	describe("Aging Report", () => {
		it.sequential("should get customer aging report", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["getCustomerAging"]
			> = {
				customerId: testCustomer.id,
			};

			const { result } =
				await ctx.caller.accountsReceivable.getCustomerAging(input);

			expect(result).toBeDefined();
			expect(result.current).toBeDefined();
			expect(result["1-30"]).toBeDefined();
			expect(result["31-60"]).toBeDefined();
			expect(result["61-90"]).toBeDefined();
			expect(result["90+"]).toBeDefined();
			expect(result.total).toBeDefined();
		});
	});

	describe("Payment Voiding", () => {
		it.sequential("should void a payment", async () => {
			const input: inferProcedureInput<
				AppRouter["accountsReceivable"]["voidPayment"]
			> = {
				id: testPayment.id,
				reason: "Customer check bounced",
			};

			const { result } = await ctx.caller.accountsReceivable.voidPayment(input);

			expect(result).toBeDefined();
			expect(result.status).toBe("voided");
			expect(result.voidReason).toBe("Customer check bounced");
		});

		it.sequential("should restore AR balance after void", async () => {
			const { result } = await ctx.caller.accountsReceivable.getById({
				id: testAR.id,
			});

			expect(result).toBeDefined();
			// After voiding the 500 payment, only the 200 credit memo remains
			expect(result.amountPaid).toBe(formatNumeric(200.0, 2));
			expect(result.amountRemaining).toBe(formatNumeric(800.0, 2));
			expect(result.status).toBe("partial");
		});
	});
});
