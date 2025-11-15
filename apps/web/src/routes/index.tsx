import { createFileRoute, Link } from "@tanstack/react-router";
import { Box } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { UserMenu } from "@/components/user-menu";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { isAuthenticated } = useAuth();
	return (
		<div className="mx-auto h-dvh max-w-7xl px-4 py-2">
			<div className="flex items-center justify-between p-4 shadow-xs backdrop-blur-sm">
				<Link to="/" className="group/brand flex items-center gap-4">
					<div className="cursor-pointer rounded-lg hover:text-foreground group-hover/brand:bg-primary/10">
						<Box className="size-6" />
					</div>
					<h1 className="font-bold font-mono text-2xl">Automachina</h1>
				</Link>
				<div className="flex items-center gap-4">
					<NavigationMenu>
						<NavigationMenuList>
							<NavigationMenuItem>
								<NavigationMenuLink asChild>
									<Link to="/products">Products</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>

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
		</div>
	);
}
