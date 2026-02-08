import { z } from "zod";
import {
	COMMERCIAL_DOCUMENT_TYPES,
	commercialDocumentsTransportInfoSchema,
	DOCUMENT_STATUSES,
	REASON_CODES,
} from "@/db/schema/commercialDocuments";

const documentLineSchema = z.object({
	productId: z.string().optional(),
	description: z.string().min(1),
	quantity: z.number().positive(),
	uomCode: z.string(),
	unitPrice: z.number().min(0),
	discountPercent: z.number().min(0).max(100).default(0),
	taxPercent: z.number().min(0).max(100).default(0),
});

const createCommercialDocument = z.object({
	documentType: z.enum(COMMERCIAL_DOCUMENT_TYPES),
	series: z.string().default("001"),
	issueDate: z.string(),
	dueDate: z.string().optional(),
	customerId: z.string().optional(),
	supplierId: z.string().optional(),
	lines: z.array(documentLineSchema).min(1),
	referenceDocumentId: z.string().optional(),
	reasonCode: z.enum(REASON_CODES).optional(),
	reasonDescription: z.string().optional(),
	transportInfo: commercialDocumentsTransportInfoSchema.optional(),
	referenceNumber: z.string().optional(),
	orderId: z.string().optional(),
	notes: z.string().optional(),
	terms: z.string().optional(),
});

const updateCommercialDocument = z.object({
	id: z.string().uuid(),
	status: z.enum(DOCUMENT_STATUSES).optional(),
	dueDate: z.string().optional(),
	notes: z.string().optional(),
	terms: z.string().optional(),
});

const listCommercialDocuments = z.object({
	documentType: z.enum(COMMERCIAL_DOCUMENT_TYPES).optional(),
	status: z.enum(DOCUMENT_STATUSES).optional(),
	customerId: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

const getCommercialDocument = z.object({
	id: z.string().uuid(),
});

const createDocumentSequence = z.object({
	documentType: z.enum(COMMERCIAL_DOCUMENT_TYPES),
	series: z.string().default("001"),
	year: z.number().int().min(2000).max(2100),
	authorizationNumber: z.string().optional(),
	authorizationStartDate: z.string().optional(),
	authorizationEndDate: z.string().optional(),
});

const generateNextDocumentNumber = z.object({
	documentType: z.enum(COMMERCIAL_DOCUMENT_TYPES),
	series: z.string().default("001"),
});

export type CreateCommercialDocumentInput = z.infer<
	typeof createCommercialDocument
>;
export type UpdateCommercialDocumentInput = z.infer<
	typeof updateCommercialDocument
>;
export type ListCommercialDocumentsInput = z.infer<
	typeof listCommercialDocuments
>;
export type GetCommercialDocumentInput = z.infer<typeof getCommercialDocument>;
export type CreateDocumentSequenceInput = z.infer<
	typeof createDocumentSequence
>;
export type GenerateNextDocumentNumberInput = z.infer<
	typeof generateNextDocumentNumber
>;

export {
	createCommercialDocument,
	createDocumentSequence,
	generateNextDocumentNumber,
	getCommercialDocument,
	listCommercialDocuments,
	updateCommercialDocument,
};
