import { Inbound } from "$lib/types";

export const parseInbound = (inbound: Inbound): Inbound => {
    if (typeof inbound.settings === "string") {
        if (inbound.settings === "") inbound.settings = {};
        else inbound.settings = JSON.parse(inbound.settings);
    }

    if (typeof inbound.streamSettings === "string") {
        if (inbound.streamSettings === "") inbound.streamSettings = {} as any;
        else inbound.streamSettings = JSON.parse(inbound.streamSettings);
    }

    if (typeof inbound.sniffing === "string") {
        if (inbound.sniffing === "") inbound.sniffing = {};
        else inbound.sniffing = JSON.parse(inbound.sniffing);
    }

    return inbound;
};
