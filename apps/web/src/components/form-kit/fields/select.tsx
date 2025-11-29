import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { withQuery } from "@/components/withTQuery";
import { cn } from "@/lib/utils";
import { useFieldContext } from "../form";
import type { FieldProps } from "./type";

type ISelectItem = {
	id: string;
	name: string;
};

type Field = {
	text: string;
	value: string;
};

type SelectProps<TData = Record<string, unknown>> = {
	selectLabel?: string;
	itemTemplate?: (item: TData) => React.ReactNode;
	field?: Field;
	items?: ISelectItem[];
};

const defaultFields = {
	text: "name",
	value: "id",
};

const SelectField = withQuery<
	FieldProps<SelectProps>,
	any,
	Record<string, unknown>[]
>(
	({
		placeholder = "Select a Value",
		data,
		selectLabel,
		field = defaultFields,
		itemTemplate,
		items,
		className,
		...props
	}) => {
		const [open, setOpen] = useState(false);
		const fieldCtx = useFieldContext<string>();
		const virtualRef = useRef<VirtualizerHandle>(null);

		const selectItems = useMemo(() => {
			if (items) return items;
			if (data) return data;
			return [];
		}, [data, items]);

		const index = useMemo(() => {
			return selectItems.findIndex(
				(item) => String(item[field.value]) === String(fieldCtx.state.value),
			);
		}, [fieldCtx.state.value, selectItems, field.value]);

		const onValueChange = (value: string) => {
			fieldCtx.handleChange(value);
		};

		useLayoutEffect(() => {
			if (!open || !fieldCtx.state.value) return;
			if (index === -1) return;
			virtualRef.current?.scrollToIndex(index);

			const timer = setTimeout(() => {
				const checkedElement = document.querySelector(
					"[data-slot='select-item'][data-state='checked']",
				) as HTMLElement;
				if (checkedElement)
					checkedElement.focus({
						preventScroll: true,
					});
			}, 100);

			return () => clearTimeout(timer);
		}, [open, fieldCtx.state.value, index]);

		return (
			<Select
				value={fieldCtx.state.value}
				onValueChange={onValueChange}
				open={open}
				onOpenChange={setOpen}
			>
				<SelectTrigger className={cn("w-full", className)} {...props}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent className="max-h-64">
					<SelectGroup>
						{selectLabel && (
							<>
								<SelectLabel>{selectLabel}</SelectLabel>
								<SelectSeparator />
							</>
						)}
						<Virtualizer
							ref={virtualRef}
							keepMounted={index !== -1 ? [index] : undefined}
							bufferSize={20}
						>
							{selectItems.map((item) => {
								const valueFieldMap = item[field.value as keyof ISelectItem] as
									| string
									| number;
								return (
									<SelectItem key={valueFieldMap} value={String(valueFieldMap)}>
										{itemTemplate
											? itemTemplate(item)
											: String(item[field.text as keyof ISelectItem])}
									</SelectItem>
								);
							})}
						</Virtualizer>
					</SelectGroup>
				</SelectContent>
			</Select>
		);
	},
);

export default SelectField;
