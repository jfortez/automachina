import { nanoid } from "nanoid";
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

type Field = {
	text: string;
	value: string;
};

type SelectProps<TData = Record<string, unknown>> = {
	selectLabel?: string;
	itemTemplate?: (item: TData) => React.ReactNode;
	field: Field;
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
		field,
		itemTemplate,
		className,
		...props
	}) => {
		const [open, setOpen] = useState(false);
		const fieldCtx = useFieldContext<string>();
		const virtuaRef = useRef<VirtualizerHandle>(null);
		const uniqueIds = useMemo(() => {
			const map = new Map<string, unknown>();
			for (let i = 0; i < data?.length; i++) {
				const item = data[i];
				map.set(nanoid(), item);
			}
			return map;
		}, []);

		const index = useMemo(() => {
			return data?.findIndex(
				(item) => String(item[field.value]) === String(fieldCtx.state.value),
			);
		}, [fieldCtx.state.value]);

		const onValuechange = (value: string) => {
			fieldCtx.handleChange(value);
		};

		useLayoutEffect(() => {
			if (!open || !fieldCtx.state.value) return;
			if (index === -1) return;
			virtuaRef.current?.scrollToIndex(index);

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
		}, [open]);

		return (
			<Select
				value={fieldCtx.state.value}
				onValueChange={onValuechange}
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
							ref={virtuaRef}
							keepMounted={index !== -1 ? [index] : undefined}
							bufferSize={20}
						>
							{data?.map((item, index) => {
								const valueFieldMap = item[field.value] as string | number;
								return (
									<SelectItem key={valueFieldMap} value={String(valueFieldMap)}>
										{itemTemplate
											? itemTemplate(item)
											: String(item[field.text])}
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
