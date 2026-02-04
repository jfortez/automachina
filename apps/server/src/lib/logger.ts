import pino from "pino";

export const logger = pino({
	name: "automachina-api",
	level: process.env.LOG_LEVEL || "info",
	transport:
		process.env.NODE_ENV !== "production"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "yyyy-mm-dd HH:MM:ss",
						ignore: "pid,hostname",
					},
				}
			: undefined,
	base: {
		service: "automachina-api",
		version: process.env.npm_package_version || "0.0.0",
		env: process.env.NODE_ENV || "development",
	},
	redact: {
		paths: [
			"password",
			"*.password",
			"token",
			"*.token",
			"apiKey",
			"*.apiKey",
			"secret",
			"*.secret",
			"authorization",
			"*.authorization",
		],
		remove: true,
	},
});
