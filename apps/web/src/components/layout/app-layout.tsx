import { Outlet } from "@tanstack/react-router";
import { useAuth } from "../auth-provider";
import { Spinner } from "../ui/spinner";

const AppLayout = () => {
	const { isPending } = useAuth();
	if (isPending)
		return (
			<div className="flex h-dvh items-center justify-center bg-background">
				<Spinner className="size-6" />
			</div>
		);
	return (
		<div className="h-dvh bg-background">
			<Outlet />
		</div>
	);
};

export default AppLayout;
