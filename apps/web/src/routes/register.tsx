import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/register")({
	component: RouteComponent,
	validateSearch: z.object({
		redirect: z.string().optional().catch("").default("/dashboard"),
	}),
	beforeLoad: ({ context, search }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: search.redirect });
		}
	},
});

function RouteComponent() {
	return <div>Hello "/register"!</div>;
}
