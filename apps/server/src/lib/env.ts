import { z } from "zod";

const envVariables = z.object({
	DATABASE_URL: z.url(),
	CORS_ORIGIN: z.url().default("http://localhost:3001"),
	BETTER_AUTH_SECRET: z.string().min(32).max(64),
	BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
	GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
	OPEN_AI_API_KEY: z.string().optional(),
});

export const env = envVariables.parse(process.env);

declare global {
	namespace NodeJS {
		interface ProcessEnv
			extends Omit<z.infer<typeof envVariables>, "DATABASE_PORT"> {}
	}
}

export default env;
