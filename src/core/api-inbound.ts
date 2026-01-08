import { InboundInput } from "../schema/inbound.js";
import { API } from "./api.js";

export class API_Inbound {
    readonly #api: API;

    constructor(api: API) {
        this.#api = api;
    }

    async getInbounds() {}

    async getInbound(id: number) {}
    async addInbound(options: InboundInput) {}
    async updateInbound(id: number, options: Partial<InboundInput>) {}
    async resetInboundsStat() {}
    async resetInboundStat(id: number) {}
    async deleteInbound(id: number) {}
}
