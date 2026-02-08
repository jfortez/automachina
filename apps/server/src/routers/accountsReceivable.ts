import {
	applyCreditMemo,
	createAccountReceivable,
	createCollectionActivity,
	createCreditMemo,
	createPayment,
	getAccountReceivable,
	getCustomerAging,
	getPayment,
	listAccountsReceivable,
	listCollectionActivities,
	listCreditMemos,
	listPayments,
	updateAccountReceivable,
	voidPayment,
} from "@/dto/accountsReceivable";
import { protectedProcedure, router } from "@/lib/trpc";
import * as accountsReceivableService from "@/services/accountsReceivable";

export const accountsReceivableRouter = router({
	create: protectedProcedure
		.input(createAccountReceivable)
		.mutation(async ({ input, ctx }) => ({
			result: await accountsReceivableService.createAccountReceivable(
				input,
				ctx.organizationId,
				ctx.session.user.id,
			),
		})),

	update: protectedProcedure
		.input(updateAccountReceivable)
		.mutation(async ({ input, ctx }) => ({
			result: await accountsReceivableService.updateAccountReceivable(
				input,
				ctx.organizationId,
			),
		})),

	list: protectedProcedure
		.input(listAccountsReceivable)
		.query(async ({ input, ctx }) =>
			accountsReceivableService.listAccountsReceivable(
				input,
				ctx.organizationId,
			),
		),

	getById: protectedProcedure
		.input(getAccountReceivable)
		.query(async ({ input, ctx }) => ({
			result: await accountsReceivableService.getAccountReceivable(
				input,
				ctx.organizationId,
			),
		})),

	getCustomerAging: protectedProcedure
		.input(getCustomerAging)
		.query(async ({ input, ctx }) => ({
			result: await accountsReceivableService.getCustomerAging(
				input,
				ctx.organizationId,
			),
		})),

	createPayment: protectedProcedure
		.input(createPayment)
		.mutation(async ({ input, ctx }) => ({
			result: await accountsReceivableService.createPayment(
				input,
				ctx.organizationId,
				ctx.session.user.id,
			),
		})),

	listPayments: protectedProcedure
		.input(listPayments)
		.query(async ({ input, ctx }) =>
			accountsReceivableService.listPayments(input, ctx.organizationId),
		),

	getPayment: protectedProcedure
		.input(getPayment)
		.query(async ({ input, ctx }) => ({
			result: await accountsReceivableService.getPayment(
				input,
				ctx.organizationId,
			),
		})),

	voidPayment: protectedProcedure
		.input(voidPayment)
		.mutation(async ({ input, ctx }) => ({
			result: await accountsReceivableService.voidPayment(
				input,
				ctx.organizationId,
				ctx.session.user.id,
			),
		})),

	createCreditMemo: protectedProcedure
		.input(createCreditMemo)
		.mutation(async ({ input, ctx }) => ({
			result: await accountsReceivableService.createCreditMemo(
				input,
				ctx.organizationId,
			),
		})),

	applyCreditMemo: protectedProcedure
		.input(applyCreditMemo)
		.mutation(async ({ input, ctx }) => ({
			result: await accountsReceivableService.applyCreditMemo(
				input,
				ctx.organizationId,
			),
		})),

	listCreditMemos: protectedProcedure
		.input(listCreditMemos)
		.query(async ({ input, ctx }) =>
			accountsReceivableService.listCreditMemos(input, ctx.organizationId),
		),

	createCollectionActivity: protectedProcedure
		.input(createCollectionActivity)
		.mutation(async ({ input, ctx }) => ({
			result: await accountsReceivableService.createCollectionActivity(
				input,
				ctx.organizationId,
			),
		})),

	listCollectionActivities: protectedProcedure
		.input(listCollectionActivities)
		.query(async ({ input, ctx }) =>
			accountsReceivableService.listCollectionActivities(
				input,
				ctx.organizationId,
			),
		),
});
