import { registerInventoryJobs } from "./handlers/inventory";
import { jobLogger } from "./logger";
import { jobQueue } from "./queue";

export async function initializeJobs(): Promise<void> {
	const logger = jobLogger.child({ component: "initialize" });
	logger.info("Initializing job system...");

	try {
		await jobQueue.start();

		await registerInventoryJobs();

		logger.info("Job system initialized successfully");
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Failed to initialize job system",
		);
		throw error;
	}
}

export async function shutdownJobs(): Promise<void> {
	const logger = jobLogger.child({ component: "shutdown" });
	logger.info("Shutting down job system...");

	try {
		await jobQueue.stop();
		logger.info("Job system shutdown successfully");
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Error during job system shutdown",
		);
		throw error;
	}
}

export type { Job, JobHandler, JobOptions } from "./queue";
export { jobQueue } from "./queue";
