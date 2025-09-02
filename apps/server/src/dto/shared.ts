import { z } from "zod";

export const recordSchema = z.record(z.string(), z.any());
