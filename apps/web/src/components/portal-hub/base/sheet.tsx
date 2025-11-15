import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createHubItem } from "../hub";
import type { HubItemComponentProps } from "../types";

const SheetComponent = ({
	title,
	description,
	children,
	open,
	className,
	onOpenChange,
	t,
}: HubItemComponentProps) => {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className={cn(className)}>
				<SheetHeader>
					<SheetTitle className={cn(!title && "sr-only")}>{title}</SheetTitle>
					<SheetDescription className={cn(!description && "sr-only")}>
						{description}
					</SheetDescription>
				</SheetHeader>
				<div className="overflow-y-auto overflow-x-hidden px-4">{children}</div>
				<SheetFooter>
					<t.Out />
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
};

export const SheetHubItem = createHubItem<"Sheet">({
	name: "Sheet",
	render: SheetComponent,
});
