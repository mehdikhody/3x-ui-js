import { API } from "./api.js";
import { URI } from "./base/uri.js";
import { ClientAPI } from "./client.js";
import { InboundAPI } from "./inbound.js";
import { ServerAPI } from "./server.js";

export class XUI {
    readonly protocol: string;
    readonly host: string;
    readonly port: number;
    readonly path: string;
    readonly username: string;

    readonly #uri: URI;
    readonly #api: API;

    readonly server: ServerAPI;
    readonly inbound: InboundAPI;
    readonly client: ClientAPI;

    constructor(uri: string) {
        this.#uri = new URI(uri);
        this.protocol = this.#uri.protocol;
        this.host = this.#uri.host;
        this.port = this.#uri.port;
        this.path = this.#uri.path;
        this.username = this.#uri.username;

        this.#api = new API(this, this.#uri);
        this.server = new ServerAPI(this, this.#api);
        this.inbound = new InboundAPI(this, this.#api);
        this.client = new ClientAPI(this, this.#api);
    }

    set log_level(level: "error" | "warn" | "info" | "http" | "debug" | "silent") {
        if (level === "silent") {
            this.#api.logger.silent = true;
            this.#api.logger.level = "error";
            return;
        }

        this.#api.logger.silent = false;
        this.#api.logger.level = level;
    }

    set cache_ttl(ttl: number) {
        this.#api.cache.options.stdTTL = ttl;
        this.#api.logger.info(`TTL set to ${ttl === 0 ? "infinity" : ttl}s`);
    }

    cacheFlush() {
        this.#api.cache.flushStats();
        this.#api.cache.flushAll();
    }
}
