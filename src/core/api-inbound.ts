import type { Inbound, InboundInput } from "../schema/inbound.js";
import { XUI } from "3x-ui/xui.js";
import { API } from "./api.js";

export class API_Inbound {
    readonly #xui: XUI;
    readonly #api: API;

    constructor(xui: XUI, api: API) {
        this.#xui = xui;
        this.#api = api;
    }

    async getInbounds() {
        if (this.#api.cache.has("inbounds")) {
            this.#api.logger.debug("Inbounds loaded from cache.");
            return this.#api.cache.get("inbounds") as Inbound[];
        }

        this.#api.logger.debug("Fetching inbounds...");
        const inbounds = await this.#api.get<Inbound[]>("/inbounds/list");

        this.#api.cache.set("inbounds", inbounds);
        return inbounds;
    }

    async getInbound(id: number) {
        if (this.#api.cache.has(`inbound:${id}`)) {
            this.#api.logger.debug(`Inbound ${id} loaded from cache.`);
            return this.#api.cache.get(`inbound:${id}`) as Inbound;
        }

        this.#api.logger.debug(`Fetching inbound ${id}...`);
        const inbound = await this.#api.get<Inbound>(`/inbounds/get/${id}`);

        this.#api.cache.set("inbound", inbound);
        return inbound;
    }

    async addInbound(options: InboundInput) {
        this.#api.logger.debug(`Adding inbound ${options.remark}...`);
        const inbound = await this.#api.post<Inbound>("/inbounds/add", {
            ...options,
            settings: JSON.stringify(options.settings),
            streamSettings: JSON.stringify(options.streamSettings),
            sniffing: JSON.stringify(options.sniffing),
        });

        this.#api.logger.info(`Inbound ${inbound.remark} added.`);
        this.#xui.flush();

        return inbound;
    }

    async updateInbound(id: number, options: Partial<InboundInput>) {}
    async resetInboundsStat() {}
    async resetInboundStat(id: number) {}
    async deleteInbound(id: number) {}
}
