import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
	accountsReceivable,
	collectionActivities,
	creditMemos,
	paymentApplications,
	payments,
} from "@/db/schema/accountsReceivable";
import { customers } from "@/db/schema/customer";
import type {
	ApplyCreditMemoInput,
	CreateAccountReceivableInput,
	CreateCollectionActivityInput,
	CreateCreditMemoInput,
	CreatePaymentInput,
	GetAccountReceivableInput,
	GetCustomerAgingInput,
	GetPaymentInput,
	ListAccountsReceivableInput,
	ListCollectionActivitiesInput,
	ListCreditMemosInput,
	ListPaymentsInput,
	UpdateAccountReceivableInput,
	VoidPaymentInput,
} from "@/dto/accountsReceivable";

export const createAccountReceivable = async (
	input: CreateAccountReceivableInput,
	organizationId: string,
	createdBy: string,
) => {
	const existing = await db
		.select()
		.from(accountsReceivable)
		.where(
			and(
				eq(accountsReceivable.organizationId, organizationId),
				eq(accountsReceivable.documentNumber, input.documentNumber),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Account receivable with this document number already exists",
		});
	}

	const [result] = await db
		.insert(accountsReceivable)
		.values({
			organizationId,
			documentNumber: input.documentNumber,
			documentType: input.documentType,
			customerId: input.customerId,
			invoiceId: input.invoiceId,
			commercialDocumentId: input.commercialDocumentId,
			originalAmount: input.originalAmount.toString(),
			amountPaid: "0",
			amountRemaining: input.amountRemaining.toString(),
			discountAvailable: input.discountAvailable?.toString() ?? "0",
			discountDueDate: input.discountDueDate,
			documentDate: input.documentDate,
			dueDate: input.dueDate,
			description: input.description,
			reference: input.reference,
			status: "open",
			collectionStatus: "normal",
			createdBy,
		})
		.returning();

	await updateCustomerBalance(input.customerId, organizationId);

	return result;
};

export const updateAccountReceivable = async (
	input: UpdateAccountReceivableInput,
	organizationId: string,
) => {
	const [existing] = await db
		.select()
		.from(accountsReceivable)
		.where(
			and(
				eq(accountsReceivable.id, input.id),
				eq(accountsReceivable.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Account receivable not found",
		});
	}

	const updateData: Partial<typeof accountsReceivable.$inferInsert> = {};

	if (input.status) updateData.status = input.status;
	if (input.dueDate) updateData.dueDate = input.dueDate;
	if (input.description !== undefined)
		updateData.description = input.description;
	if (input.reference !== undefined) updateData.reference = input.reference;
	if (input.isDisputed !== undefined) updateData.isDisputed = input.isDisputed;
	if (input.disputeReason !== undefined)
		updateData.disputeReason = input.disputeReason;
	if (input.collectionStatus)
		updateData.collectionStatus = input.collectionStatus;

	if (input.isDisputed) {
		updateData.disputeDate = new Date().toISOString();
	}

	const [result] = await db
		.update(accountsReceivable)
		.set(updateData)
		.where(eq(accountsReceivable.id, input.id))
		.returning();

	return result;
};

export const listAccountsReceivable = async (
	input: ListAccountsReceivableInput,
	organizationId: string,
) => {
	const conditions = [eq(accountsReceivable.organizationId, organizationId)];

	if (input.customerId) {
		conditions.push(eq(accountsReceivable.customerId, input.customerId));
	}
	if (input.status) {
		conditions.push(eq(accountsReceivable.status, input.status));
	}
	if (input.documentType) {
		conditions.push(eq(accountsReceivable.documentType, input.documentType));
	}
	if (input.agingBucket) {
		conditions.push(eq(accountsReceivable.agingBucket, input.agingBucket));
	}
	if (input.isOverdue) {
		conditions.push(lte(accountsReceivable.dueDate, new Date().toISOString()));
	}
	if (input.dateFrom) {
		conditions.push(gte(accountsReceivable.documentDate, input.dateFrom));
	}
	if (input.dateTo) {
		conditions.push(lte(accountsReceivable.documentDate, input.dateTo));
	}

	const results = await db
		.select({
			ar: accountsReceivable,
			customerName: customers.name,
		})
		.from(accountsReceivable)
		.leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
		.where(and(...conditions))
		.orderBy(desc(accountsReceivable.documentDate))
		.limit(input.limit)
		.offset((input.page - 1) * input.limit);

	const countResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(accountsReceivable)
		.where(and(...conditions));

	return {
		items: results.map((r) => ({
			...r.ar,
			customerName: r.customerName,
		})),
		total: countResult[0]?.count ?? 0,
		page: input.page,
		limit: input.limit,
	};
};

export const getAccountReceivable = async (
	input: GetAccountReceivableInput,
	organizationId: string,
) => {
	const [result] = await db
		.select({
			ar: accountsReceivable,
			customerName: customers.name,
		})
		.from(accountsReceivable)
		.leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
		.where(
			and(
				eq(accountsReceivable.id, input.id),
				eq(accountsReceivable.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!result) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Account receivable not found",
		});
	}

	return { ...result.ar, customerName: result.customerName ?? "" };
};

export const getCustomerAging = async (
	input: GetCustomerAgingInput,
	organizationId: string,
) => {
	const arList = await db
		.select()
		.from(accountsReceivable)
		.where(
			and(
				eq(accountsReceivable.organizationId, organizationId),
				eq(accountsReceivable.customerId, input.customerId),
				eq(accountsReceivable.status, "open"),
			),
		);

	const aging = {
		current: 0,
		"1-30": 0,
		"31-60": 0,
		"61-90": 0,
		"90+": 0,
		total: 0,
	};

	const now = new Date();

	for (const ar of arList) {
		const dueDate = new Date(ar.dueDate);
		const daysOverdue = Math.floor(
			(now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		const amount = Number.parseFloat(ar.amountRemaining);

		if (daysOverdue <= 0) {
			aging.current += amount;
		} else if (daysOverdue <= 30) {
			aging["1-30"] += amount;
		} else if (daysOverdue <= 60) {
			aging["31-60"] += amount;
		} else if (daysOverdue <= 90) {
			aging["61-90"] += amount;
		} else {
			aging["90+"] += amount;
		}
		aging.total += amount;
	}

	return aging;
};

export const createPayment = async (
	input: CreatePaymentInput,
	organizationId: string,
	createdBy: string,
) => {
	return await db.transaction(async (tx) => {
		const [payment] = await tx
			.insert(payments)
			.values({
				organizationId,
				paymentNumber: input.paymentNumber,
				paymentDate: input.paymentDate,
				customerId: input.customerId,
				paymentMethod: input.paymentMethod,
				paymentMethodDetails: input.paymentMethodDetails,
				totalAmount: input.totalAmount.toString(),
				unappliedAmount: input.totalAmount.toString(),
				currency: input.currency,
				exchangeRate: input.exchangeRate?.toString() ?? "1",
				depositAccountId: input.depositAccountId,
				depositDate: input.depositDate,
				notes: input.notes,
				status: "posted",
				createdBy,
			})
			.returning();

		if (input.applications && input.applications.length > 0) {
			let totalApplied = 0;

			for (const app of input.applications) {
				await tx.insert(paymentApplications).values({
					paymentId: payment.id,
					arId: app.arId,
					amountApplied: app.amountApplied.toString(),
					discountTaken: app.discountTaken?.toString() ?? "0",
					writeOffAmount: app.writeOffAmount?.toString() ?? "0",
					appliedAt: new Date().toISOString(),
					appliedBy: createdBy,
				});

				const [ar] = await tx
					.select()
					.from(accountsReceivable)
					.where(eq(accountsReceivable.id, app.arId))
					.limit(1);

				if (ar) {
					const newAmountPaid =
						Number.parseFloat(ar.amountPaid) + app.amountApplied;
					const newAmountRemaining =
						Number.parseFloat(ar.originalAmount) - newAmountPaid;
					const newStatus = newAmountRemaining <= 0 ? "paid" : "partial";

					await tx
						.update(accountsReceivable)
						.set({
							amountPaid: newAmountPaid.toString(),
							amountRemaining: Math.max(0, newAmountRemaining).toString(),
							status: newStatus,
							paidAt: newStatus === "paid" ? new Date().toISOString() : null,
						})
						.where(eq(accountsReceivable.id, app.arId));

					await tx
						.update(customers)
						.set({
							currentBalance: sql`${customers.currentBalance} - ${app.amountApplied}`,
							lastPaymentDate: input.paymentDate,
							lastPaymentAmount: app.amountApplied.toString(),
						})
						.where(eq(customers.id, ar.customerId));
				}

				totalApplied += app.amountApplied;
			}

			await tx
				.update(payments)
				.set({
					unappliedAmount: (input.totalAmount - totalApplied).toString(),
				})
				.where(eq(payments.id, payment.id));

			// Re-query to get the updated payment with correct unappliedAmount
			const [updatedPayment] = await tx
				.select()
				.from(payments)
				.where(eq(payments.id, payment.id))
				.limit(1);

			return updatedPayment;
		}

		return payment;
	});
};

export const listPayments = async (
	input: ListPaymentsInput,
	organizationId: string,
) => {
	const conditions = [eq(payments.organizationId, organizationId)];

	if (input.customerId) {
		conditions.push(eq(payments.customerId, input.customerId));
	}
	if (input.status) {
		conditions.push(eq(payments.status, input.status));
	}
	if (input.dateFrom) {
		conditions.push(gte(payments.paymentDate, input.dateFrom));
	}
	if (input.dateTo) {
		conditions.push(lte(payments.paymentDate, input.dateTo));
	}

	const results = await db
		.select({
			payment: payments,
			customerName: customers.name,
		})
		.from(payments)
		.leftJoin(customers, eq(payments.customerId, customers.id))
		.where(and(...conditions))
		.orderBy(desc(payments.paymentDate))
		.limit(input.limit)
		.offset((input.page - 1) * input.limit);

	const countResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(payments)
		.where(and(...conditions));

	return {
		items: results.map((r) => ({
			...r.payment,
			customerName: r.customerName ?? "",
		})),
		total: countResult[0]?.count ?? 0,
		page: input.page,
		limit: input.limit,
	};
};

export const getPayment = async (
	input: GetPaymentInput,
	organizationId: string,
) => {
	const [result] = await db
		.select({
			payment: payments,
			customerName: customers.name,
		})
		.from(payments)
		.leftJoin(customers, eq(payments.customerId, customers.id))
		.where(
			and(
				eq(payments.id, input.id),
				eq(payments.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!result) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Payment not found",
		});
	}

	const applications = await db
		.select()
		.from(paymentApplications)
		.where(eq(paymentApplications.paymentId, input.id));

	return {
		...result.payment,
		customerName: result.customerName ?? "",
		applications,
	};
};

export const voidPayment = async (
	input: VoidPaymentInput,
	organizationId: string,
	voidedBy: string,
) => {
	return await db.transaction(async (tx) => {
		const [payment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.id, input.id),
					eq(payments.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!payment) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Payment not found",
			});
		}

		if (payment.status === "voided") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Payment is already voided",
			});
		}

		const apps = await tx
			.select()
			.from(paymentApplications)
			.where(eq(paymentApplications.paymentId, input.id));

		for (const app of apps) {
			const [ar] = await tx
				.select()
				.from(accountsReceivable)
				.where(eq(accountsReceivable.id, app.arId))
				.limit(1);

			if (ar) {
				const newAmountPaid =
					Number.parseFloat(ar.amountPaid) -
					Number.parseFloat(app.amountApplied);
				const newAmountRemaining =
					Number.parseFloat(ar.originalAmount) - newAmountPaid;

				await tx
					.update(accountsReceivable)
					.set({
						amountPaid: Math.max(0, newAmountPaid).toString(),
						amountRemaining: newAmountRemaining.toString(),
						status: newAmountPaid <= 0 ? "open" : "partial",
						paidAt: null,
					})
					.where(eq(accountsReceivable.id, app.arId));

				await tx
					.update(customers)
					.set({
						currentBalance: sql`${customers.currentBalance} + ${app.amountApplied}`,
					})
					.where(eq(customers.id, ar.customerId));
			}

			await tx
				.update(paymentApplications)
				.set({ isReversed: true })
				.where(eq(paymentApplications.id, app.id));
		}

		const [result] = await tx
			.update(payments)
			.set({
				status: "voided",
				voidedBy,
				voidedAt: new Date().toISOString(),
				voidReason: input.reason,
			})
			.where(eq(payments.id, input.id))
			.returning();

		return result;
	});
};

export const createCreditMemo = async (
	input: CreateCreditMemoInput,
	organizationId: string,
) => {
	const existing = await db
		.select()
		.from(creditMemos)
		.where(
			and(
				eq(creditMemos.organizationId, organizationId),
				eq(creditMemos.documentNumber, input.documentNumber),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Credit memo with this document number already exists",
		});
	}

	const [result] = await db
		.insert(creditMemos)
		.values({
			organizationId,
			documentNumber: input.documentNumber,
			customerId: input.customerId,
			originalArId: input.originalArId,
			reasonCode: input.reasonCode,
			reasonDescription: input.reasonDescription,
			totalAmount: input.totalAmount.toString(),
			appliedAmount: "0",
			remainingAmount: input.totalAmount.toString(),
			documentDate: input.documentDate,
			expirationDate: input.expirationDate,
			status: "open",
		})
		.returning();

	return result;
};

export const applyCreditMemo = async (
	input: ApplyCreditMemoInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		const [creditMemo] = await tx
			.select()
			.from(creditMemos)
			.where(
				and(
					eq(creditMemos.id, input.creditMemoId),
					eq(creditMemos.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!creditMemo) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Credit memo not found",
			});
		}

		const remainingCredit = Number.parseFloat(creditMemo.remainingAmount);
		if (input.amount > remainingCredit) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Amount exceeds remaining credit",
			});
		}

		const [ar] = await tx
			.select()
			.from(accountsReceivable)
			.where(
				and(
					eq(accountsReceivable.id, input.arId),
					eq(accountsReceivable.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!ar) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Account receivable not found",
			});
		}

		const newAppliedAmount =
			Number.parseFloat(creditMemo.appliedAmount) + input.amount;
		const newRemainingAmount =
			Number.parseFloat(creditMemo.totalAmount) - newAppliedAmount;

		await tx
			.update(creditMemos)
			.set({
				appliedAmount: newAppliedAmount.toString(),
				remainingAmount: newRemainingAmount.toString(),
				status: newRemainingAmount <= 0 ? "applied" : "open",
			})
			.where(eq(creditMemos.id, input.creditMemoId));

		const newArAmountPaid = Number.parseFloat(ar.amountPaid) + input.amount;
		const newArRemaining =
			Number.parseFloat(ar.originalAmount) - newArAmountPaid;
		const newArStatus = newArRemaining <= 0 ? "paid" : "partial";

		await tx
			.update(accountsReceivable)
			.set({
				amountPaid: newArAmountPaid.toString(),
				amountRemaining: Math.max(0, newArRemaining).toString(),
				status: newArStatus,
				paidAt: newArStatus === "paid" ? new Date().toISOString() : null,
			})
			.where(eq(accountsReceivable.id, input.arId));

		await tx
			.update(customers)
			.set({
				currentBalance: sql`${customers.currentBalance} - ${input.amount}`,
			})
			.where(eq(customers.id, ar.customerId));

		return { success: true };
	});
};

export const listCreditMemos = async (
	input: ListCreditMemosInput,
	organizationId: string,
) => {
	const conditions = [eq(creditMemos.organizationId, organizationId)];

	if (input.customerId) {
		conditions.push(eq(creditMemos.customerId, input.customerId));
	}
	if (input.status) {
		conditions.push(eq(creditMemos.status, input.status));
	}

	const results = await db
		.select({
			creditMemo: creditMemos,
			customerName: customers.name,
		})
		.from(creditMemos)
		.leftJoin(customers, eq(creditMemos.customerId, customers.id))
		.where(and(...conditions))
		.orderBy(desc(creditMemos.documentDate))
		.limit(input.limit)
		.offset((input.page - 1) * input.limit);

	const countResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(creditMemos)
		.where(and(...conditions));

	return {
		items: results.map((r) => ({
			...r.creditMemo,
			customerName: r.customerName ?? "",
		})),
		total: countResult[0]?.count ?? 0,
		page: input.page,
		limit: input.limit,
	};
};

export const createCollectionActivity = async (
	input: CreateCollectionActivityInput,
	organizationId: string,
) => {
	const [result] = await db
		.insert(collectionActivities)
		.values({
			organizationId,
			customerId: input.customerId,
			arId: input.arId,
			activityType: input.activityType,
			activityDate: input.activityDate,
			contactName: input.contactName,
			contactMethod: input.contactMethod,
			promisedAmount: input.promisedAmount?.toString(),
			promisedDate: input.promisedDate,
			subject: input.subject,
			notes: input.notes,
			followUpDate: input.followUpDate,
			assignedTo: input.assignedTo,
		})
		.returning();

	return result;
};

export const listCollectionActivities = async (
	input: ListCollectionActivitiesInput,
	organizationId: string,
) => {
	const conditions = [eq(collectionActivities.organizationId, organizationId)];

	if (input.customerId) {
		conditions.push(eq(collectionActivities.customerId, input.customerId));
	}
	if (input.arId) {
		conditions.push(eq(collectionActivities.arId, input.arId));
	}
	if (input.activityType) {
		conditions.push(eq(collectionActivities.activityType, input.activityType));
	}
	if (input.dateFrom) {
		conditions.push(gte(collectionActivities.activityDate, input.dateFrom));
	}
	if (input.dateTo) {
		conditions.push(lte(collectionActivities.activityDate, input.dateTo));
	}

	const results = await db
		.select({
			activity: collectionActivities,
			customerName: customers.name,
		})
		.from(collectionActivities)
		.leftJoin(customers, eq(collectionActivities.customerId, customers.id))
		.where(and(...conditions))
		.orderBy(desc(collectionActivities.activityDate))
		.limit(input.limit)
		.offset((input.page - 1) * input.limit);

	const countResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(collectionActivities)
		.where(and(...conditions));

	return {
		items: results.map((r) => ({
			...r.activity,
			customerName: r.customerName ?? "",
		})),
		total: countResult[0]?.count ?? 0,
		page: input.page,
		limit: input.limit,
	};
};

const updateCustomerBalance = async (
	customerId: string,
	organizationId: string,
) => {
	const result = await db
		.select({
			totalRemaining: sql<number>`COALESCE(SUM(${accountsReceivable.amountRemaining}), 0)`,
		})
		.from(accountsReceivable)
		.where(
			and(
				eq(accountsReceivable.customerId, customerId),
				eq(accountsReceivable.organizationId, organizationId),
				eq(accountsReceivable.status, "open"),
			),
		);

	await db
		.update(customers)
		.set({
			currentBalance: result[0]?.totalRemaining?.toString() ?? "0",
		})
		.where(eq(customers.id, customerId));
};
