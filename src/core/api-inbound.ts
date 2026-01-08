import type { Inbound, InboundInput } from "../schema/inbound.js";
import { API } from "./api.js";

export class API_Inbound {
    readonly #api: API;

    constructor(api: API) {
        this.#api = api;
    }

    async getInbounds() {
        if (this.#api.cache.has("inbounds")) {
            this.#api.logger.debug("Cache hit for inbounds");
            return this.#api.cache.get("inbounds") as Inbound[];
        }

        this.#api.logger.debug("Fetching inbounds...");
        const inbounds = await this.#api.get<Inbound[]>("/inbounds/list");

        this.#api.cache.set("inbounds", inbounds);
        return inbounds;
    }

    async getInbound(id: number) {}
    async addInbound(options: InboundInput) {}
    async updateInbound(id: number, options: Partial<InboundInput>) {}
    async resetInboundsStat() {}
    async resetInboundStat(id: number) {}
    async deleteInbound(id: number) {}
}
