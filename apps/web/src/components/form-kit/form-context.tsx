import { createContext, useContext } from "react";
import type { Components, ParsedSchema } from "./types";

type IFormContext<C extends Components = Components> = {
	components?: C;
	schema: ParsedSchema;
};

const FormKitProvider = createContext<IFormContext>({} as IFormContext);

export const FormComponentsProvider = FormKitProvider.Provider;

export const useFormKit = () => {
	const ctx = useContext(FormKitProvider);
	if (!ctx) throw new Error("FormComponentsContext not found");
	return ctx;
};
