import type React from "react";
import { createContext, useContext, useRef } from "react";

import { create, type StoreApi, type UseBoundStore, useStore } from "zustand";
import type { FactoryStore, StoreSetters, StoreStates } from "./types";

export class Store<TKeys extends readonly string[]> {
	private factoryStore:
		| UseBoundStore<StoreApi<FactoryStore<TKeys>>>
		| undefined;
	private FactoryContext:
		| React.Context<UseBoundStore<StoreApi<FactoryStore<TKeys>>>>
		| undefined;
	private keys: TKeys;
	private withProvider?: boolean;
	constructor(keys: TKeys, withProvider = false) {
		this.keys = keys;
		this.withProvider = withProvider;

		if (withProvider) {
			this.FactoryContext = createContext<
				UseBoundStore<StoreApi<FactoryStore<TKeys>>>
			>(null as unknown as UseBoundStore<StoreApi<FactoryStore<TKeys>>>);
		} else {
			this.factoryStore = this.createFactoryStore();
		}
	}

	private createFactoryStore() {
		return create<FactoryStore<TKeys>>()((set) => {
			const states = {} as StoreStates<TKeys>;
			for (const key of this.keys) {
				states[key as TKeys[number]] = false;
			}

			const setters = {} as StoreSetters<TKeys>;
			for (const key of this.keys) {
				const capitalizedKey = (key.charAt(0).toUpperCase() +
					key.slice(1)) as Capitalize<TKeys[number]>;
				const setterKey = `set${capitalizedKey}` as keyof StoreSetters<TKeys>;

				setters[setterKey] = ((value: boolean) =>
					set((state) => ({
						...state,
						states: { ...state.states, [key]: value },
					}))) as any;
			}

			return {
				states,
				...setters,
			};
		});
	}

	public createProvider = () => {
		if (!this.FactoryContext) {
			throw new Error("FactoryContext is not defined");
		}

		const createStore = this.createFactoryStore;
		const Context = this.FactoryContext!;

		const Provider: React.FC<{ children: React.ReactNode }> = ({
			children,
		}) => {
			const storeRef = useRef<UseBoundStore<
				StoreApi<FactoryStore<TKeys>>
			> | null>(null);

			if (!storeRef.current) {
				storeRef.current = createStore();
			}

			const store = storeRef.current;

			return <Context.Provider value={store}> {children} </Context.Provider>;
		};

		return Provider;
	};

	public getStore = () => {
		if (this.withProvider) {
			return this.getStoreHook();
		}
		return this.factoryStore!;
	};

	private getStoreHook = () => {
		if (!this.FactoryContext) {
			throw new Error("FactoryContext is not defined");
		}
		const FactoryContext = this.FactoryContext;

		return function _useStore<T>(selector: (state: FactoryStore<TKeys>) => T) {
			const store = useContext(FactoryContext);

			if (!store) {
				throw new Error("useStore must be used within a Provider");
			}

			return useStore(store, selector);
		} as UseBoundStore<StoreApi<FactoryStore<TKeys>>>;
	};
}
