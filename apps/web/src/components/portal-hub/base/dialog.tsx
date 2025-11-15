import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createHubItem } from "../hub";
import type { HubItemComponentProps } from "../types";

type MyCustomPropThatIsDefinedFromInit = {
	foo: "bar";
	cabrones: string;
};

type DialogComponentProps = HubItemComponentProps &
	MyCustomPropThatIsDefinedFromInit;

const DialogComponent = ({
	title,
	description,
	children,
	open,
	className,
	onOpenChange,
	t,
	foo,
}: DialogComponentProps) => {
	const handleOpenChange = (open: boolean) => {
		const activeElement = document.activeElement;
		if (activeElement) {
			const targetClasses = [".e-ddl", "e-lib", ".e-input-group"];
			const isSyncfusionComponent = targetClasses.some(
				(className) =>
					activeElement.classList.contains(className) ||
					activeElement.closest(className),
			);
			if (isSyncfusionComponent) return;
		}

		onOpenChange?.(open);
	};

	return (
		<Dialog modal={false} open={open} onOpenChange={handleOpenChange}>
			<DialogContent className={cn(className)}>
				{foo}
				<DialogHeader>
					<DialogTitle className={cn(!title && "sr-only")}>{title}</DialogTitle>
					<DialogDescription className={cn(!description && "sr-only")}>
						{description}
					</DialogDescription>
				</DialogHeader>
				<div className="overflow-y-auto overflow-x-hidden">{children}</div>
				<DialogFooter>
					<t.Out />
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export const DialogHubItem = createHubItem<
	"Dialog",
	MyCustomPropThatIsDefinedFromInit
>({
	name: "Dialog",
	render: DialogComponent,
});
