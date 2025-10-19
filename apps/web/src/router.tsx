import { createRouter } from "@tanstack/react-router";
import DefaultLoader from "./components/default-loader";
import { queryClient, trpc } from "./lib/trpc";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultPendingComponent: () => <DefaultLoader />,
	context: { trpc, queryClient, auth: undefined! },
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
