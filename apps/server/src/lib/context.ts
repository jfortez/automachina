import type { Context as HonoContext } from "hono";
import { auth } from "./auth";
import { logger } from "./logger";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContextInner({ headers }: { headers: Headers }) {
	const session = await auth.api.getSession({
		headers,
	});
	return {
		session,
		logger: session?.user?.id
			? logger.child({ userId: session.user.id })
			: logger,
	};
}

export async function createContext({ context }: CreateContextOptions) {
	const ctxInner = await createContextInner({
		headers: context.req.raw.headers,
	});
	return ctxInner;
}

export type Context = Awaited<ReturnType<typeof createContext>>;
