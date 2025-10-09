import {
	deleteInvoiceSchema,
	generateInvoiceFromOrderSchema,
	getInvoiceByIdSchema,
	listInvoicesSchema,
	markInvoiceAsPaidSchema,
	updateInvoiceSchema,
} from "@/dto/invoice";
import { protectedProcedure, router } from "@/lib/trpc";
import * as invoiceService from "@/services/invoice";

export const invoiceRouter = router({
	// Generate invoice from fulfilled order
	generateFromOrder: protectedProcedure
		.input(generateInvoiceFromOrderSchema)
		.mutation(async ({ input }) => {
			return invoiceService.generateInvoiceFromOrder(input);
		}),

	// Get invoice by ID with items
	getById: protectedProcedure
		.input(getInvoiceByIdSchema)
		.query(async ({ input }) => {
			return invoiceService.getInvoiceById(input);
		}),

	// List invoices with pagination and filters
	list: protectedProcedure
		.input(listInvoicesSchema)
		.query(async ({ input }) => {
			return invoiceService.getInvoices(input);
		}),

	// Update invoice (limited operations)
	update: protectedProcedure
		.input(updateInvoiceSchema)
		.mutation(async ({ input }) => {
			return invoiceService.updateInvoice(input);
		}),

	// Delete invoice (soft delete)
	delete: protectedProcedure
		.input(deleteInvoiceSchema)
		.mutation(async ({ input }) => {
			return invoiceService.deleteInvoice(input);
		}),

	// Mark invoice as paid
	markAsPaid: protectedProcedure
		.input(markInvoiceAsPaidSchema)
		.mutation(async ({ input }) => {
			return invoiceService.markInvoiceAsPaid(input);
		}),
});
