import { z } from "zod/v4";

export const ResponseSchema = z.union([
    z.object({
        success: z.literal(true),
        msg: z.string(),
        obj: z.object({}),
    }),
    z.object({
        success: z.literal(false),
        msg: z.string(),
        obj: z.null(),
    }),
]);

export type Response = z.infer<typeof ResponseSchema>;
