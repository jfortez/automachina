import { Outlet } from "@tanstack/react-router";
import { useAuth } from "../auth-provider";
import DefaultLoader from "../default-loader";

const AppLayout = () => {
	const { isPending } = useAuth();
	if (isPending) return <DefaultLoader />;
	return (
		<div className="min-h-dvh bg-background">
			<Outlet />
		</div>
	);
};

export default AppLayout;
