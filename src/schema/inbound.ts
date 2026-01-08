import { z } from "zod/v4";
import { Inbound as I } from "xray-zod";

export const InboundInputSchema = I.InboundObject.and(
    z.object({
        remark: z.string(),
        enable: z.boolean(),
        expiryTime: z.number(),
        trafficReset: z.enum(["never"]),
        clientStats: z.null(),
    }),
);

export const InboundSchema = InboundInputSchema.and(
    z.object({
        id: z.number().int(),
        up: z.number(),
        down: z.number(),
        total: z.number(),
        allTime: z.number(),
        lastTrafficResetTime: z.number(),
    }),
);

export type InboundInput = z.infer<typeof InboundInputSchema>;
export type Inbound = z.infer<typeof InboundSchema>;
