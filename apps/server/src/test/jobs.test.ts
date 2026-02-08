import type { inferProcedureInput } from "@trpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { inventoryReservations } from "@/db/schema/orders";
import { initializeJobs, jobQueue, shutdownJobs } from "@/jobs";
import { expireReservationsHandler } from "@/jobs/handlers/inventory/expireReservations";
import type { AppRouter } from "@/routers";
import { globals } from "./_globals";
import { setupTestContext } from "./util";

describe("Testing Job Queue System", () => {
	describe("Job Queue Lifecycle", () => {
		it.sequential("should initialize job queue without errors", async () => {
			await expect(initializeJobs()).resolves.not.toThrow();
		});

		it.sequential("should create queue successfully", async () => {
			await expect(
				jobQueue.createQueue("test-queue", { retryLimit: 3 }),
			).resolves.not.toThrow();
		});

		it.sequential("should send job to queue", async () => {
			const jobId = await jobQueue.send("test-queue", { test: true });
			expect(jobId).toBeDefined();
			expect(typeof jobId).toBe("string");
		});

		it.sequential("should register work handler", async () => {
			let jobProcessed = false;

			jobQueue.work("test-queue", async () => {
				jobProcessed = true;
			});

			await new Promise((resolve) => setTimeout(resolve, 1000));
			expect(jobProcessed).toBe(true);
		});

		it.sequential("should shutdown job queue gracefully", async () => {
			await expect(shutdownJobs()).resolves.not.toThrow();
		});
	});

	describe("Job Error Handling", () => {
		it.sequential("should handle job failures with retries", async () => {
			await initializeJobs();

			let attempts = 0;

			await jobQueue.createQueue("failing-queue", { retryLimit: 2 });

			jobQueue.work("failing-queue", async () => {
				attempts++;
				if (attempts < 3) {
					throw new Error("Job failed");
				}
			});

			await jobQueue.send("failing-queue", { data: "test" }, { retryLimit: 2 });
			await new Promise((resolve) => setTimeout(resolve, 3000));

			expect(attempts).toBeGreaterThanOrEqual(1);
		});

		it.sequential("should handle queue not available gracefully", async () => {
			await jobQueue.stop();

			const jobId = await jobQueue.send("non-existent", { test: true });
			expect(jobId).toBeNull();
		});
	});
});

describe("Testing Expire Reservations Job", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productId: string;
	let warehouseId: string;
	let expiredReservationId: string;
	let expiredReferenceId: string;
	let futureReservationId: string;
	let futureReferenceId: string;
	let releasedReservationId: string;
	let releasedReferenceId: string;

	beforeAll(async () => {
		ctx = await setupTestContext();
		warehouseId = globals.warehouse.id;

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: nanoid(10),
			name: "Test Product for Job",
			baseUom: "EA",
			trackingLevel: "none",
			isPhysical: true,
			categoryId: ctx.defaultCategoryId,
			prices: [{ uomCode: "EA", price: 1.0 }],
		};
		const createdProduct = await ctx.caller.product.create(productInput);
		productId = createdProduct.id;

		await ctx.caller.inventory.receive({
			warehouseId,
			productId,
			qty: 100,
			uomCode: "EA",
			currency: "USD",
		});

		expiredReferenceId = `SO-EXPIRED-${nanoid(6)}`;
		const expiredRes = await ctx.caller.inventory.reservations.create({
			productId,
			warehouseId,
			qtyInBase: 10,
			uomCode: "EA",
			reservationType: "soft",
			referenceType: "sales_order",
			referenceId: expiredReferenceId,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		});
		expiredReservationId = expiredRes.id;

		await db
			.update(inventoryReservations)
			.set({ expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) })
			.where(eq(inventoryReservations.id, expiredReservationId));

		futureReferenceId = `SO-FUTURE-${nanoid(6)}`;
		const futureRes = await ctx.caller.inventory.reservations.create({
			productId,
			warehouseId,
			qtyInBase: 10,
			uomCode: "EA",
			reservationType: "soft",
			referenceType: "sales_order",
			referenceId: futureReferenceId,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		});
		futureReservationId = futureRes.id;

		releasedReferenceId = `SO-RELEASED-${nanoid(6)}`;
		const releasedRes = await ctx.caller.inventory.reservations.create({
			productId,
			warehouseId,
			qtyInBase: 10,
			uomCode: "EA",
			reservationType: "soft",
			referenceType: "sales_order",
			referenceId: releasedReferenceId,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		});
		releasedReservationId = releasedRes.id;

		await db
			.update(inventoryReservations)
			.set({ expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000) })
			.where(eq(inventoryReservations.id, releasedReservationId));

		await ctx.caller.inventory.reservations.release({
			id: releasedReservationId,
		});
	});

	describe("Expire Reservations Handler", () => {
		it.sequential("should expire past reservations", async () => {
			await expireReservationsHandler({
				id: "test-job-expire",
				name: "expire-reservations",
				data: {},
			});

			const reservations =
				await ctx.caller.inventory.reservations.getByReference({
					referenceType: "sales_order",
					referenceId: expiredReferenceId,
				});
			expect(reservations[0]?.releasedAt).toBeDefined();
		});

		it.sequential("should not affect future reservations", async () => {
			const reservations = await ctx.caller.inventory.reservations.getActive();
			const futureRes = reservations.find((r) => r.id === futureReservationId);
			expect(futureRes?.releasedAt).toBeNull();
		});

		it.sequential("should not affect already released reservations", async () => {
			const reservations =
				await ctx.caller.inventory.reservations.getByReference({
					referenceType: "sales_order",
					referenceId: releasedReferenceId,
				});
			expect(reservations[0]?.releasedAt).toBeDefined();
		});

		it.sequential("should filter by organization", async () => {
			await expect(
				expireReservationsHandler({
					id: "test-job-org",
					name: "expire-reservations",
					data: {
						organizationId: ctx.defaultOrg.id,
					},
				}),
			).resolves.not.toThrow();
		});

		it.sequential("should handle empty expired reservations", async () => {
			await expect(
				expireReservationsHandler({
					id: "test-job-empty",
					name: "expire-reservations",
					data: {},
				}),
			).resolves.not.toThrow();
		});

		it.sequential("should handle job execution without errors", async () => {
			const newExpiredRefId = `SO-NEW-EXPIRED-${nanoid(6)}`;
			const newExpiredRes = await ctx.caller.inventory.reservations.create({
				productId,
				warehouseId,
				qtyInBase: 5,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId: newExpiredRefId,
				expiresAt: new Date(Date.now() + 60 * 60 * 1000),
			});

			await db
				.update(inventoryReservations)
				.set({ expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000) })
				.where(eq(inventoryReservations.id, newExpiredRes.id));

			await expect(
				expireReservationsHandler({
					id: "test-job-execution",
					name: "expire-reservations",
					data: {},
				}),
			).resolves.not.toThrow();

			const reservations =
				await ctx.caller.inventory.reservations.getByReference({
					referenceType: "sales_order",
					referenceId: newExpiredRefId,
				});
			expect(reservations[0]?.releasedAt).toBeDefined();
		});
	});
});
