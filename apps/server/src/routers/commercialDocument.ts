import { z } from "zod";
import {
	createCommercialDocument,
	createDocumentSequence,
	generateNextDocumentNumber,
	getCommercialDocument,
	listCommercialDocuments,
	updateCommercialDocument,
} from "@/dto/commercialDocument";
import { protectedProcedure, router } from "@/lib/trpc";
import * as commercialDocumentService from "@/services/commercialDocument";

export const commercialDocumentRouter = router({
	create: protectedProcedure
		.input(createCommercialDocument)
		.mutation(async ({ input, ctx }) => ({
			result: await commercialDocumentService.createCommercialDocument(
				input,
				ctx.organizationId,
			),
		})),

	getById: protectedProcedure
		.input(getCommercialDocument)
		.query(async ({ input }) => ({
			result: await commercialDocumentService.getCommercialDocumentById(input),
		})),

	list: protectedProcedure
		.input(listCommercialDocuments)
		.query(async ({ input, ctx }) =>
			commercialDocumentService.listCommercialDocuments(
				input,
				ctx.organizationId,
			),
		),

	update: protectedProcedure
		.input(updateCommercialDocument)
		.mutation(async ({ input }) => ({
			result: await commercialDocumentService.updateCommercialDocument(input),
		})),

	generateNumber: protectedProcedure
		.input(generateNextDocumentNumber)
		.mutation(async ({ input, ctx }) => ({
			result: await commercialDocumentService.generateNextDocumentNumber(
				input,
				ctx.organizationId,
			),
		})),

	createSequence: protectedProcedure
		.input(createDocumentSequence)
		.mutation(async ({ input, ctx }) => ({
			result: await commercialDocumentService.createDocumentSequence(
				input,
				ctx.organizationId,
			),
		})),
});
