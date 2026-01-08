import { API_Inbound } from "./core/api-inbound.js";
import { API } from "./core/api.js";

export class XUI {
    readonly protocol: string;
    readonly host: string;
    readonly port: number;
    readonly path: string;
    readonly username: string;
    readonly #api: API;

    readonly inbound: API_Inbound;

    /**
     * @param uri uri
     */
    constructor(uri: string) {
        this.#api = new API(uri);
        this.protocol = this.#api.protocol;
        this.host = this.#api.host;
        this.port = this.#api.port;
        this.path = this.#api.path;
        this.username = this.#api.username;

        this.inbound = new API_Inbound(this.#api);
    }

    /**
     * Log level
     */
    set log_level(level: "error" | "warn" | "info" | "http" | "debug" | "silent") {
        if (level === "silent") {
            this.#api.logger.silent = true;
            this.#api.logger.level = "error";
            return;
        }

        this.#api.logger.silent = false;
        this.#api.logger.level = level;
    }

    /**
     * Cache time to live in seconds
     */
    set cache_ttl(ttl: number) {
        this.#api.cache.options.stdTTL = ttl;
        this.#api.logger.info(`TTL set to ${ttl === 0 ? "infinity" : ttl}s`);
    }

    /**
     * Flush cached data
     */
    flush() {
        this.#api.cache.flushStats();
        this.#api.cache.flushAll();
    }
}
