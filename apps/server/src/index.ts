import "dotenv/config";
import { google } from "@ai-sdk/google";
import { trpcServer } from "@hono/trpc-server";
import { convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { initializeJobs, shutdownJobs } from "./jobs";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { logger } from "./lib/logger";
import { appRouter } from "./routers/index";

const app = new Hono();

app.use(honoLogger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.post("/ai", async (c) => {
	const body = await c.req.json();
	const uiMessages = body.messages || [];
	const result = streamText({
		model: google("gemini-1.5-flash"),
		messages: convertToModelMessages(uiMessages),
	});

	return result.toUIMessageStreamResponse();
});

app.get("/", (c) => {
	return c.text("OK");
});

import { serve } from "@hono/node-server";

(async () => {
	try {
		await initializeJobs();

		const server = serve(
			{
				fetch: app.fetch,
				port: 3000,
			},
			(info) => {
				logger.info(`Server is running on http://localhost:${info.port}`);
			},
		);

		const gracefulShutdown = async (signal: string) => {
			logger.info({ signal }, "Received shutdown signal");

			server.close(async (err) => {
				if (err) {
					logger.error({ err }, "Error during server shutdown");
					process.exit(1);
				}

				await shutdownJobs();
				logger.info("Shutdown complete");
				process.exit(0);
			});
		};

		process.on("SIGINT", () => gracefulShutdown("SIGINT"));
		process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
	} catch (error) {
		logger.error({ error }, "Failed to start server");
		process.exit(1);
	}
})();
