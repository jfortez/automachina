import { PgBoss, type Job as PgBossJob, type Queue } from "pg-boss";
import { env } from "@/lib/env";
import { jobLogger } from "./logger";

export type JobOptions = {
	startAfter?: Date | string;
	retryLimit?: number;
	retryDelay?: number;
	retryBackoff?: boolean;
};

export type Job<T = unknown> = {
	id: string;
	name: string;
	data: T;
};

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export class JobQueue {
	private boss: PgBoss | null = null;
	private logger = jobLogger.child({ component: "queue-manager" });
	private isStarted = false;

	async start(): Promise<void> {
		if (this.isStarted) {
			this.logger.warn("Job queue already started");
			return;
		}

		try {
			this.logger.info("Initializing job queue...");

			this.boss = new PgBoss({
				host: env.DATABASE_HOST,
				port: env.DATABASE_PORT,
				user: env.DATABASE_USER,
				password: env.DATABASE_PASSWORD,
				database: env.DATABASE_NAME,
				schema: "pgboss",
			});

			this.boss.on("error", (error: Error) => {
				this.logger.error({ error: error.message }, "PgBoss error");
			});

			await this.boss.start();
			this.isStarted = true;
			this.logger.info("Job queue started successfully");
		} catch (error) {
			this.logger.warn(
				{ error: error instanceof Error ? error.message : String(error) },
				"pg-boss not available, job queue disabled",
			);
		}
	}

	async stop(): Promise<void> {
		if (!this.boss || !this.isStarted) {
			return;
		}

		this.logger.info("Stopping job queue...");
		await this.boss.stop();
		this.isStarted = false;
		this.logger.info("Job queue stopped");
	}

	async send<T>(
		name: string,
		data: T,
		options?: JobOptions,
	): Promise<string | null> {
		if (!this.boss || !this.isStarted) {
			this.logger.debug({ name }, "Job queue not available, skipping job");
			return null;
		}

		const jobId = await this.boss.send(name, data as object, options);
		this.logger.info({ jobId, name }, "Job scheduled");
		return jobId;
	}

	work<T>(name: string, handler: JobHandler<T>): void {
		if (!this.boss || !this.isStarted) {
			this.logger.debug(
				{ name },
				"Job queue not available, skipping handler registration",
			);
			return;
		}

		this.boss.work(name, async (jobs: PgBossJob[]) => {
			for (const job of jobs) {
				const childLogger = this.logger.child({
					jobId: job.id,
					jobName: name,
				});

				childLogger.info({ data: job.data }, "Job started");
				const startTime = Date.now();

				try {
					await handler({
						id: job.id,
						name: job.name,
						data: job.data as T,
					});

					childLogger.info(
						{ duration: Date.now() - startTime },
						"Job completed successfully",
					);
				} catch (error) {
					childLogger.error(
						{
							error: error instanceof Error ? error.message : String(error),
							duration: Date.now() - startTime,
						},
						"Job failed",
					);
					throw error;
				}
			}
		});
	}

	async schedule(
		name: string,
		cron: string,
		data: unknown,
		options?: { retryLimit?: number },
	): Promise<void> {
		if (!this.boss || !this.isStarted) {
			this.logger.debug(
				{ name, cron },
				"Job queue not available, skipping schedule",
			);
			return;
		}

		await this.boss.schedule(name, cron, data as object, options);
		this.logger.info({ name, cron }, "Job scheduled with cron");
	}

	async createQueue(
		name: string,
		options?: Omit<Queue, "name">,
	): Promise<void> {
		if (!this.boss || !this.isStarted) {
			this.logger.debug(
				{ name },
				"Job queue not available, skipping queue creation",
			);
			return;
		}

		try {
			await this.boss.createQueue(name, options);
			this.logger.info({ name }, "Queue created");
		} catch (error) {
			this.logger.debug(
				{ name, error: error instanceof Error ? error.message : String(error) },
				"Queue creation skipped (may already exist)",
			);
		}
	}
}

export const jobQueue = new JobQueue();
