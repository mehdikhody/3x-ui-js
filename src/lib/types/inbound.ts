import type { Client, ClientOptions } from "./client";
import type { InboundObject } from "xray-zod";

export type Inbound = Pick<
    InboundObject,
    "protocol" | "settings" | "streamSettings" | "sniffing"
> & {
    id: number;
    up: number;
    down: number;
    total: number;
    remark: string;
    enable: boolean;
    expiryTime: number;
    clientStats: Client[];
    listen: string;
    port: number;
    tag: string;
};

export type InboundOptions = Pick<
    InboundObject,
    "protocol" | "settings" | "streamSettings" | "sniffing"
> & {
    enable: boolean;
    remark: string;
    listen: string;
    port: number;
    expiryTime: number;
};
