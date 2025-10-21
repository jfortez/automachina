import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";
import { z } from "zod";
import { LoginForm } from "@/components/login-form";

export const Route = createFileRoute("/login")({
	component: LoginPage,
	validateSearch: z.object({
		redirect: z.string().optional().default("/dashboard"),
	}),
	beforeLoad: ({ context, search }) => {
		console.log(search);
		if (context.auth.isAuthenticated) {
			throw redirect({ to: search.redirect });
		}
	},
});

function LoginPage() {
	const search = Route.useSearch();
	const redirect = search.redirect;
	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex justify-center gap-2 md:justify-start">
					<Link to="/" className="flex items-center gap-2 font-medium">
						<div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
							<GalleryVerticalEnd className="size-4" />
						</div>
						Acme Inc.
					</Link>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<LoginForm redirect={redirect} />
					</div>
				</div>
			</div>
			<div className="relative hidden bg-muted lg:block">
				<img
					src="/placeholder.svg"
					alt="swswsw"
					className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
				/>
			</div>
		</div>
	);
}
