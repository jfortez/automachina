import { createFormHook } from "@tanstack/react-form";
import {
	Field,
	FieldControl,
	FieldDescription,
	FieldError,
	FieldLabel,
	fieldContext,
	formContext,
} from "./form";

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		Field: Field,
		Label: FieldLabel,
		Control: FieldControl,
		Description: FieldDescription,
		Error: FieldError,
	},
	formComponents: {},
});
