import { API } from "./api.js";
import { Inbound, InboundInput } from "./schema/inbound.js";
import { XUI } from "./xui.js";

export class InboundAPI {
    readonly #xui: XUI;
    readonly #api: API;

    constructor(xui: XUI, api: API) {
        this.#xui = xui;
        this.#api = api;
    }

    /**
     * Get all inbounds
     */
    async list() {
        if (this.#api.cache.has("inbounds")) {
            this.#api.logger.debug("Inbounds loaded from cache.");
            return this.#api.cache.get("inbounds") as Inbound[];
        }

        this.#api.logger.debug("Fetching inbounds...");
        const inbounds = await this.#api.get<Inbound[]>("/inbounds/list");

        this.#api.cache.set("inbounds", inbounds);
        for (const inbound of inbounds) {
            this.#api.cache.set(`inbound:${inbound.id}`, inbound);
        }

        return inbounds;
    }

    /**
     * Get inbound by ID
     */
    async get(id: number) {
        if (this.#api.cache.has(`inbound:${id}`)) {
            this.#api.logger.debug(`Inbound ${id} loaded from cache.`);
            return this.#api.cache.get(`inbound:${id}`) as Inbound;
        }

        this.#api.logger.debug(`Fetching inbound ${id}...`);
        const inbound = await this.#api.get<Inbound>(`/inbounds/get/${id}`);

        this.#api.cache.set(`inbound:${id}`, inbound);
        return inbound;
    }

    /**
     * Add new inbound
     */
    async add(options: InboundInput) {
        this.#api.logger.debug(`Adding inbound ${options.remark}...`);
        const inbound = await this.#api.post<Inbound>("/inbounds/add", {
            ...options,
            settings: JSON.stringify(options.settings || {}),
            streamSettings: JSON.stringify(options.streamSettings || {}),
            sniffing: JSON.stringify(options.sniffing || {}),
        });

        this.#api.logger.info(`Inbound ${inbound.remark} added.`);
        this.#xui.cacheFlush();

        return inbound;
    }

    /**
     * Update inbound by ID
     */
    async update(id: number, options: Partial<InboundInput>) {
        const current = await this.get(id);
        if (!current) {
            this.#api.logger.warn(`Inbound ${id} not found. Skipping update.`);
            return null;
        }

        this.#api.logger.debug(`Updating inbound ${id}.`);
        const data = { ...current, ...options };
        const inbound = await this.#api.post<Inbound>(`/update/${id}`, {
            ...data,
            settings: JSON.stringify(data.settings),
            streamSettings: JSON.stringify(data.streamSettings),
            sniffing: JSON.stringify(data.sniffing),
        });

        this.#api.logger.info(`Inbound ${inbound.remark} updated.`);
        this.#xui.cacheFlush();
        return inbound;
    }

    /**
     * Delete inbound by ID
     */
    async delete(id: number) {
        this.#api.logger.debug(`Deleting inbound ${id}.`);
        await this.#api.post(`/del/${id}`);
        this.#api.logger.info(`Inbound ${id} deleted.`);
        this.#xui.cacheFlush();
    }

    /**
     * Resets traffic statistics.
     *
     * Behavior:
     * - If `id` is provided, resets traffic for all clients belonging to the inbound with that `id`.
     * - If `id` is omitted or `undefined`, resets traffic for all inbounds.
     */
    async reset(id?: number) {
        if (id === undefined) {
            this.#api.logger.debug("Resetting inbounds stat...");
            await this.#api.post(`/resetAllTraffics`);
            this.#xui.cacheFlush();
            this.#api.logger.info("Inbounds stat reseted.");
            return;
        }

        this.#api.logger.debug(`Resetting inbound ${id} stat...`);
        await this.#api.post(`/resetAllClientTraffics/${id}`);
        this.#xui.cacheFlush();
        this.#api.logger.info(`Inbound ${id} stat reseted.`);
    }
}
