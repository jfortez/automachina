import { createFileRoute, Link } from "@tanstack/react-router";
import { Box } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { isAuthenticated } = useAuth();
	return (
		<div className="mx-auto h-dvh max-w-7xl p-4">
			<div className="flex items-center justify-between rounded-lg border bg-muted p-4 shadow-xs backdrop-blur-sm">
				<div className="cursor-pointer rounded-lg hover:bg-primary/10 hover:text-foreground">
					<Box className="size-6" />
				</div>
				<div className="flex items-center gap-4">
					{isAuthenticated ? (
						<UserMenu />
					) : (
						<>
							<Button size="sm" variant="ghost" asChild>
								<Link to="/login">Login</Link>
							</Button>
							<Button size="sm" asChild>
								<Link to="/register">Register</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
