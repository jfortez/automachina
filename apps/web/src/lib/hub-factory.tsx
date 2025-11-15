import { DialogHubItem } from "@/components/portal-hub/base/dialog";
import { SheetHubItem } from "@/components/portal-hub/base/sheet";
import { Factory } from "@/components/portal-hub/factory";

const states = ["createProduct", "createCategory"] as const;

const f = new Factory(states).with(DialogHubItem).with(SheetHubItem).build();

type ProductState = {
	mode: "create" | "edit";
	setMode: (mode: "create" | "edit") => void;
};

export const productSheet = f
	.createHOC("createProduct", "Sheet")
	.extend<ProductState>((set) => ({
		mode: "create",
		setMode: (mode) => set({ mode }),
	}))
	.init({
		title: (store) => {
			return store.mode === "create" ? "Create a Product" : "Edit Product";
		},
		description: (store) => {
			return store.mode === "create"
				? "Fill in the details of the product you want to create"
				: "Fill in the details of the product you want to edit";
		},
	});
