import { Slot } from "@radix-ui/react-slot";
import type React from "react";
import { useCallback } from "react";
import tunnel from "tunnel-rat";
import { create, type StoreApi, type UseBoundStore } from "zustand";

import type {
	_SharedProps,
	Capitalize,
	FactoryStore,
	HubItemComponentProps,
	InitHocProps,
} from "./types";

type HocProps<TProps extends object> = TProps & {
	close: () => void;
	FooterButtons: ReturnType<typeof tunnel>["In"];
};

type ExtendedState<T> = T & {
	_internal?: any;
};

type UseInnerContextHook<TState> = <TSelected = TState>(
	selector?: (state: TState) => TSelected,
) => TSelected;

export class Builder<
	TKeys extends readonly string[],
	TKey extends TKeys[number],
	TExtendedProps extends object = object,
	TExtendedState extends object = object,
	Extended extends boolean = false,
> {
	private key: TKey;
	private t: ReturnType<typeof tunnel>;
	private options: InitHocProps<TExtendedProps>;
	private HubItemComponent: React.ComponentType<HubItemComponentProps>;
	private innerStore?: UseBoundStore<StoreApi<ExtendedState<TExtendedState>>>;
	private useFactoryStore: UseBoundStore<StoreApi<FactoryStore<TKeys>>>;
	private extended: boolean;

	constructor(
		key: TKey,
		useFactoryStore: UseBoundStore<StoreApi<FactoryStore<TKeys>>>,
		HubItemComponent: React.ComponentType<HubItemComponentProps>,
		options: InitHocProps<TExtendedProps> = {} as InitHocProps<TExtendedProps>,
		extended: Extended = false as Extended,
	) {
		this.key = key;
		this.t = tunnel();
		this.options = options;
		this.HubItemComponent = HubItemComponent;
		this.useFactoryStore = useFactoryStore;
		this.extended = extended;
	}

	init(
		options: InitHocProps<
			TExtendedProps,
			Extended extends true ? TExtendedState : never
		>,
	): Builder<TKeys, TKey, TExtendedProps, TExtendedState, Extended> {
		const newBuilder = new Builder<
			TKeys,
			TKey,
			TExtendedProps,
			TExtendedState,
			Extended
		>(
			this.key,
			this.useFactoryStore,
			this.HubItemComponent,
			{ ...this.options, ...options },
			this.extended as Extended,
		);
		newBuilder.t = this.t;
		newBuilder.innerStore = this.innerStore;

		return newBuilder;
	}

	extend<TNewState extends object>(
		storeCreator: (
			set: StoreApi<ExtendedState<TNewState>>["setState"],
			get: StoreApi<ExtendedState<TNewState>>["getState"],
		) => TNewState,
	): Builder<TKeys, TKey, TExtendedProps, TNewState, true> {
		const newBuilder = new Builder<
			TKeys,
			TKey,
			TExtendedProps,
			TNewState,
			true
		>(
			this.key,
			this.useFactoryStore,
			this.HubItemComponent,
			this.options,
			true,
		);
		newBuilder.t = this.t;

		newBuilder.innerStore = create<ExtendedState<TNewState>>()((set, get) => ({
			...storeCreator(set, get),
		}));

		// TODO: omit extended state from newBuilder
		return newBuilder;
	}

	private getInnerStore = () => {
		const innerStore = this.innerStore;

		return () => innerStore!;
	};

	get useInnerContext(): Extended extends true
		? UseInnerContextHook<TExtendedState>
		: never {
		return this.getInnerStore() as Extended extends true
			? UseInnerContextHook<TExtendedState>
			: never;
	}

	hoc = <TProps extends object = object>(
		Component: React.ComponentType<
			HocProps<
				TProps &
					(Extended extends true
						? {
								useInnerContext: UseInnerContextHook<TExtendedState>;
							}
						: object)
			>
		>,
	): React.FC<TProps> => {
		const key = this.key;
		const t = this.t;
		const options = this.options;
		const HubItemComponent = this.HubItemComponent;
		const innerStore = this.innerStore!;
		const useInnerContextHook = this.getInnerStore()();
		const useFactoryStore = this.useFactoryStore;

		return (props: TProps) => {
			const isOpen = useFactoryStore((store) => store.states[key]);
			const capitalize = (key.charAt(0).toUpperCase() +
				key.slice(1)) as Capitalize<TKey>;
			const openChange = useFactoryStore(
				(store) =>
					store[`set${capitalize}` as keyof typeof store] as (
						value: boolean,
					) => void,
			);

			const close = useCallback(() => {
				openChange(false);
			}, [openChange]);

			const componentProps: any = {
				...props,
				close,
				FooterButtons: t.In,
			};

			if (this.extended) {
				componentProps.useInnerContext = useInnerContextHook;
			}

			const parsedOptions = Object.fromEntries(
				Object.entries(options).map(([key, value]) => {
					if (typeof value === "function") {
						return [key, value(innerStore.getState())];
					}
					return [key, value];
				}),
			) as _SharedProps<TExtendedProps>;

			return (
				<HubItemComponent
					open={isOpen}
					onOpenChange={openChange}
					t={t}
					{...parsedOptions}
				>
					<Component {...componentProps} />
				</HubItemComponent>
			);
		};
	};

	trigger = <TProps extends object = object>({
		before,
		...props
	}: TProps & {
		before?: (innerStore: TExtendedState) => void;
	}) => {
		const key = this.key;
		const capitalize = (key.charAt(0).toUpperCase() +
			key.slice(1)) as Capitalize<TKey>;

		const openChange = this.useFactoryStore(
			(store) =>
				store[`set${capitalize}` as keyof typeof store] as (
					value: boolean,
				) => void,
		);

		const handleClick = () => {
			before?.(this.innerStore!.getState());
			openChange(true);
		};

		return <Slot onClick={handleClick} {...props} />;
	};
}
