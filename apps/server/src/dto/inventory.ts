import { z } from "zod";
import { reservationTypes } from "@/db/schema/orders";

export const handlingUnitTypes = [
	"pallet",
	"box",
	"carton",
	"container",
	"bin",
] as const;

export const createHandlingUnit = z.object({
	code: z.string().min(1).max(50),
	type: z.enum(handlingUnitTypes),
	locationId: z.string(),
	warehouseId: z.string().optional(),
	capacity: z.number().positive().optional(),
	weightLimit: z.number().positive().optional(),
	weightLimitUom: z.string().optional(),
	dimensions: z
		.object({
			length: z.number().positive(),
			width: z.number().positive(),
			height: z.number().positive(),
		})
		.optional(),
	parentId: z.string().optional(),
});

export const moveHandlingUnit = z.object({
	id: z.string(),
	toLocationId: z.string(),
	notes: z.string().optional(),
});

export const addHandlingUnitContent = z.object({
	handlingUnitId: z.string(),
	productId: z.string(),
	quantity: z.number().positive(),
	uomCode: z.string().min(1),
	batchId: z.string().optional(),
	serialNumber: z.string().optional(),
});

export const removeHandlingUnitContent = z.object({
	handlingUnitId: z.string(),
	contentId: z.string(),
	quantity: z.number().positive(),
});

export const createReservation = z.object({
	reservationType: z.enum(reservationTypes),
	referenceType: z.string().optional(),
	referenceId: z.string().optional(),
	productId: z.string(),
	warehouseId: z.string().optional(),
	batchId: z.string().optional(),
	handlingUnitId: z.string().optional(),
	qtyInBase: z.number().positive(),
	uomCode: z.string().min(1),
	expiresAt: z.date().optional(),
	notes: z.string().optional(),
});

export const releaseReservation = z.object({
	id: z.string(),
	reason: z.string().optional(),
});

export const extendReservation = z.object({
	id: z.string(),
	expiresAt: z.date(),
});

export const receiveInventorySchema = z.object({
	productId: z.string(),
	qty: z.number().positive(),
	uomCode: z.string().min(1),
	warehouseId: z.string().optional(),
	cost: z.number().min(0).optional(),
	currency: z.string().default("USD"),
});

export type ReceiveInventoryInput = z.infer<typeof receiveInventorySchema>;

export const sellProductSchema = z.object({
	productId: z.string(),
	lines: z
		.array(
			z.object({
				qty: z.number().positive(),
				uomCode: z.string().min(1),
			}),
		)
		.min(1),
	warehouseId: z.string().optional(),
});

export type SellProductInput = z.infer<typeof sellProductSchema>;

export const adjustInventorySchema = z.object({
	warehouseId: z.string(),
	productId: z.string(),
	adjustmentType: z.enum(["pos", "neg"]),
	qty: z.number().positive(),
	uomCode: z.string().min(1),
	reason: z.string().min(1),
	notes: z.string().optional(),
	physicalCountId: z.string().optional(),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;

export type CreateHandlingUnitInput = z.infer<typeof createHandlingUnit>;
export type MoveHandlingUnitInput = z.infer<typeof moveHandlingUnit>;
export type AddHandlingUnitContentInput = z.infer<
	typeof addHandlingUnitContent
>;
export type RemoveHandlingUnitContentInput = z.infer<
	typeof removeHandlingUnitContent
>;
export type CreateReservationInput = z.infer<typeof createReservation>;
export type ReleaseReservationInput = z.infer<typeof releaseReservation>;
export type ExtendReservationInput = z.infer<typeof extendReservation>;
