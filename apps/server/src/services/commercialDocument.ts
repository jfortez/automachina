import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
	commercialDocumentLines,
	commercialDocuments,
	documentSequences,
} from "@/db/schema/commercialDocuments";
import type {
	CreateCommercialDocumentInput,
	CreateDocumentSequenceInput,
	GenerateNextDocumentNumberInput,
	GetCommercialDocumentInput,
	ListCommercialDocumentsInput,
	UpdateCommercialDocumentInput,
} from "@/dto/commercialDocument";

export const generateNextDocumentNumber = async (
	input: GenerateNextDocumentNumberInput,
	organizationId: string,
) => {
	const currentYear = new Date().getFullYear();

	return await db.transaction(async (tx) => {
		let [sequence] = await tx
			.select()
			.from(documentSequences)
			.where(
				and(
					eq(documentSequences.organizationId, organizationId),
					eq(documentSequences.documentType, input.documentType),
					eq(documentSequences.series, input.series),
					eq(documentSequences.year, currentYear),
				),
			)
			.limit(1);

		if (!sequence) {
			const [newSequence] = await tx
				.insert(documentSequences)
				.values({
					organizationId,
					documentType: input.documentType,
					series: input.series,
					year: currentYear,
					lastNumber: 0,
				})
				.returning();
			sequence = newSequence;
		}

		const nextNumber = sequence.lastNumber + 1;

		await tx
			.update(documentSequences)
			.set({ lastNumber: nextNumber })
			.where(eq(documentSequences.id, sequence.id));

		const prefix = getDocumentPrefix(input.documentType);
		const paddedNumber = nextNumber.toString().padStart(9, "0");
		const documentNumber = `${prefix}-${input.series}-${currentYear}${paddedNumber}`;

		return {
			documentNumber,
			series: input.series,
			number: nextNumber,
		};
	});
};

const getDocumentPrefix = (documentType: string): string => {
	const prefixes: Record<string, string> = {
		invoice: "FAC",
		sales_note: "NV",
		proforma: "PRO",
		delivery_guide: "GR",
		credit_note: "NC",
		debit_note: "ND",
		purchase_invoice: "FCP",
	};
	return prefixes[documentType] || "DOC";
};

export const createCommercialDocument = async (
	input: CreateCommercialDocumentInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		const { documentNumber, series } = await generateNextDocumentNumber(
			{ documentType: input.documentType, series: input.series },
			organizationId,
		);

		let subtotal = 0;
		let discountTotal = 0;
		let taxTotal = 0;

		const linesWithTotals = input.lines.map((line, index) => {
			const lineSubtotal = line.quantity * line.unitPrice;
			const lineDiscount = lineSubtotal * (line.discountPercent / 100);
			const taxableAmount = lineSubtotal - lineDiscount;
			const lineTax = taxableAmount * (line.taxPercent / 100);
			const lineTotal = taxableAmount + lineTax;

			subtotal += lineSubtotal;
			discountTotal += lineDiscount;
			taxTotal += lineTax;

			return {
				...line,
				lineNumber: index + 1,
				discountAmount: lineDiscount,
				taxAmount: lineTax,
				lineTotal,
			};
		});

		const total = subtotal - discountTotal + taxTotal;

		const [document] = await tx
			.insert(commercialDocuments)
			.values({
				organizationId,
				documentType: input.documentType,
				documentNumber,
				series,
				issueDate: input.issueDate,
				dueDate: input.dueDate,
				customerId: input.customerId,
				supplierId: input.supplierId,
				referenceDocumentId: input.referenceDocumentId,
				reasonCode: input.reasonCode,
				reasonDescription: input.reasonDescription,
				subtotal: subtotal.toString(),
				discountTotal: discountTotal.toString(),
				taxTotal: taxTotal.toString(),
				total: total.toString(),
				transportInfo: input.transportInfo,
				referenceNumber: input.referenceNumber,
				orderId: input.orderId,
				notes: input.notes,
				terms: input.terms,
				status: "draft",
			})
			.returning();

		const lines = await Promise.all(
			linesWithTotals.map((line) =>
				tx
					.insert(commercialDocumentLines)
					.values({
						documentId: document.id,
						productId: line.productId,
						description: line.description,
						quantity: line.quantity.toString(),
						uomCode: line.uomCode,
						unitPrice: line.unitPrice.toString(),
						discountPercent: line.discountPercent.toString(),
						discountAmount: line.discountAmount.toString(),
						taxPercent: line.taxPercent.toString(),
						taxAmount: line.taxAmount.toString(),
						lineTotal: line.lineTotal.toString(),
						lineNumber: line.lineNumber,
					})
					.returning(),
			),
		);

		return { document, lines };
	});
};

export const getCommercialDocumentById = async (
	input: GetCommercialDocumentInput,
) => {
	const [document] = await db
		.select()
		.from(commercialDocuments)
		.where(eq(commercialDocuments.id, input.id))
		.limit(1);

	if (!document) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Document not found",
		});
	}

	const lines = await db
		.select()
		.from(commercialDocumentLines)
		.where(eq(commercialDocumentLines.documentId, input.id))
		.orderBy(commercialDocumentLines.lineNumber);

	return { document, lines };
};

export const listCommercialDocuments = async (
	input: ListCommercialDocumentsInput,
	organizationId: string,
) => {
	const { documentType, status, customerId, dateFrom, dateTo, page, limit } =
		input;
	const offset = (page - 1) * limit;

	const conditions = [eq(commercialDocuments.organizationId, organizationId)];

	if (documentType) {
		conditions.push(eq(commercialDocuments.documentType, documentType));
	}

	if (status) {
		conditions.push(eq(commercialDocuments.status, status));
	}

	if (customerId) {
		conditions.push(eq(commercialDocuments.customerId, customerId));
	}

	if (dateFrom) {
		conditions.push(gte(commercialDocuments.issueDate, dateFrom));
	}

	if (dateTo) {
		conditions.push(lte(commercialDocuments.issueDate, dateTo));
	}

	const whereConditions =
		conditions.length > 1 ? and(...conditions) : conditions[0];

	const [countResult] = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(commercialDocuments)
		.where(whereConditions);

	const total = Number(countResult?.count || 0);

	const documents = await db
		.select()
		.from(commercialDocuments)
		.where(whereConditions)
		.orderBy(desc(commercialDocuments.issueDate))
		.limit(limit)
		.offset(offset);

	return {
		documents,
		pagination: {
			page,
			limit,
			total,
			hasMore: page * limit < total,
		},
	};
};

export const updateCommercialDocument = async (
	input: UpdateCommercialDocumentInput,
) => {
	const { id, ...data } = input;

	const [existing] = await db
		.select()
		.from(commercialDocuments)
		.where(eq(commercialDocuments.id, id))
		.limit(1);

	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Document not found",
		});
	}

	if (existing.status !== "draft" && data.status === undefined) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Only draft documents can be updated",
		});
	}

	const [updated] = await db
		.update(commercialDocuments)
		.set({
			status: data.status,
			dueDate: data.dueDate,
			notes: data.notes,
			terms: data.terms,
		})
		.where(eq(commercialDocuments.id, id))
		.returning();

	return updated;
};

export const createDocumentSequence = async (
	input: CreateDocumentSequenceInput,
	organizationId: string,
) => {
	const [existing] = await db
		.select()
		.from(documentSequences)
		.where(
			and(
				eq(documentSequences.organizationId, organizationId),
				eq(documentSequences.documentType, input.documentType),
				eq(documentSequences.series, input.series),
				eq(documentSequences.year, input.year),
			),
		)
		.limit(1);

	if (existing) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Sequence already exists for this document type, series and year",
		});
	}

	const [sequence] = await db
		.insert(documentSequences)
		.values({
			organizationId,
			documentType: input.documentType,
			series: input.series,
			year: input.year,
			lastNumber: 0,
			authorizationNumber: input.authorizationNumber,
			authorizationStartDate: input.authorizationStartDate,
			authorizationEndDate: input.authorizationEndDate,
		})
		.returning();

	return sequence;
};
