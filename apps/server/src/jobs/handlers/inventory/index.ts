import { jobQueue } from "../../queue";
import { expireReservationsHandler } from "./expireReservations";

export async function registerInventoryJobs(): Promise<void> {
	// Create queue first (required by pg-boss v12)
	await jobQueue.createQueue("expire-reservations");

	jobQueue.work("expire-reservations", expireReservationsHandler);

	await jobQueue.schedule(
		"expire-reservations",
		"0 */6 * * *", // 6h interval
		{},
		{ retryLimit: 3 },
	);
}
