import * as auth from "./auth";
import * as customers from "./customer";
import * as handlingUnits from "./handlingUnits";
import * as inventory from "./inventory";
import * as invoice from "./invoice";
import * as orders from "./orders";
import * as products from "./products";
import * as suppliers from "./suppliers";
import * as tax from "./tax";

import * as uom from "./uom";
import * as warehouse from "./warehouse";

export const schema = {
	...auth,
	...customers,
	...inventory,
	...orders,
	...warehouse,
	...products,
	...uom,
	...suppliers,
	...handlingUnits,
	...tax,
	...invoice,
};

export type Schema = typeof schema;
