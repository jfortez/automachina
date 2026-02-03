import { z } from "zod";
import {
	addHandlingUnitContent,
	adjustInventorySchema,
	createHandlingUnit,
	createReservation,
	extendReservation,
	moveHandlingUnit,
	receiveInventorySchema,
	releaseReservation,
	removeHandlingUnitContent,
	sellProductSchema,
} from "@/dto/inventory";
import { protectedProcedure, router } from "@/lib/trpc";
import * as inventoryServices from "@/services/inventory";

export const inventoryRouter = router({
	receive: protectedProcedure
		.input(receiveInventorySchema)
		.mutation(async ({ input, ctx }) => {
			return inventoryServices.receiveInventory(input, ctx.organizationId);
		}),
	sell: protectedProcedure
		.input(sellProductSchema)
		.mutation(async ({ input, ctx }) => {
			return inventoryServices.sellProduct(input, ctx.organizationId);
		}),
	adjust: protectedProcedure
		.input(adjustInventorySchema)
		.mutation(async ({ input, ctx }) => {
			return inventoryServices.adjustInventory(input, ctx.organizationId);
		}),

	handlingUnits: router({
		create: protectedProcedure
			.input(createHandlingUnit)
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.createHandlingUnit(input, ctx.organizationId);
			}),
		move: protectedProcedure
			.input(moveHandlingUnit)
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.moveHandlingUnit(input, ctx.organizationId);
			}),
		addContent: protectedProcedure
			.input(addHandlingUnitContent)
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.addHandlingUnitContent(
					input,
					ctx.organizationId,
				);
			}),
		removeContent: protectedProcedure
			.input(removeHandlingUnitContent)
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.removeHandlingUnitContent(
					input,
					ctx.organizationId,
				);
			}),
		getById: protectedProcedure
			.input(z.string())
			.query(async ({ input, ctx }) => {
				return inventoryServices.getHandlingUnitById(input, ctx.organizationId);
			}),
		getByLocation: protectedProcedure
			.input(z.string())
			.query(async ({ input, ctx }) => {
				return inventoryServices.getHandlingUnitsByLocation(
					input,
					ctx.organizationId,
				);
			}),
		delete: protectedProcedure
			.input(z.string())
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.deleteHandlingUnit(input, ctx.organizationId);
			}),
	}),

	reservations: router({
		create: protectedProcedure
			.input(createReservation)
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.createReservation(input, ctx.organizationId);
			}),
		release: protectedProcedure
			.input(releaseReservation)
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.releaseReservation(input, ctx.organizationId);
			}),
		extend: protectedProcedure
			.input(extendReservation)
			.mutation(async ({ input, ctx }) => {
				return inventoryServices.extendReservation(input, ctx.organizationId);
			}),
		getActive: protectedProcedure.query(async ({ ctx }) => {
			return inventoryServices.getActiveReservations(ctx.organizationId);
		}),
		getByProduct: protectedProcedure
			.input(z.string())
			.query(async ({ input, ctx }) => {
				return inventoryServices.getReservationsByProduct(
					input,
					ctx.organizationId,
				);
			}),
		getByReference: protectedProcedure
			.input(z.object({ referenceType: z.string(), referenceId: z.string() }))
			.query(async ({ input, ctx }) => {
				return inventoryServices.getReservationsByReference(
					input.referenceType,
					input.referenceId,
					ctx.organizationId,
				);
			}),
	}),
});
