import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { inventoryReservations } from "@/db/schema/orders";
import { jobLogger } from "../../logger";
import type { Job } from "../../queue";

export interface ExpireReservationsData {
	organizationId?: string;
}

export const expireReservationsHandler = async (
	job: Job<ExpireReservationsData>,
) => {
	const logger = jobLogger.child({
		jobId: job.id,
		jobName: "expire-reservations",
		organizationId: job.data.organizationId,
	});

	logger.info("Starting reservation expiration job");
	const now = new Date();

	try {
		const conditions = [
			isNull(inventoryReservations.releasedAt),

			lte(inventoryReservations.expiresAt, now),
		];

		if (job.data.organizationId) {
			conditions.push(
				eq(inventoryReservations.organizationId, job.data.organizationId),
			);
		}

		const result = await db
			.update(inventoryReservations)
			.set({
				releasedAt: now,
				releaseReason: "expired",
			})
			.where(and(...conditions))
			.returning({ id: inventoryReservations.id });

		logger.info(
			{ expiredCount: result.length },
			"Reservation expiration job completed",
		);
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Reservation expiration job failed",
		);
		throw error;
	}
};
