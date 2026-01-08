import winston from "winston";
import { createLogger } from "./utils/createLogger.js";
import { parseUrl } from "./utils/parseUrl.js";
import NodeCache from "node-cache";
import { Mutex } from "async-mutex";
import qs from "qs";
import Axios, { AxiosInstance } from "axios";
import { ProxyAgent } from "proxy-agent";

export class Api {
    readonly host: string;
    readonly port: number;
    readonly protocol: string;
    readonly path: string;
    readonly username: string;
    readonly #password: string;
    readonly #mutex: Mutex;
    readonly #cache: NodeCache;
    readonly #logger: winston.Logger;
    readonly #axios: AxiosInstance;

    #session: string;

    constructor(uri: string) {
        const schema = parseUrl(uri);
        this.protocol = schema.protocol;
        this.host = schema.host;
        this.port = schema.port;
        this.path = schema.path;
        this.username = schema.username;
        this.#password = schema.password;

        this.#mutex = new Mutex();

        this.#cache = new NodeCache();
        this.#cache.options.stdTTL = 10;

        this.#logger = createLogger(`[API][${this.host}]`);
        this.#logger.silent = true;

        this.#session = "";
        this.#axios = Axios.create({
            baseURL: schema.endpoint,
            proxy: false,
            httpAgent: new ProxyAgent(),
            httpsAgent: new ProxyAgent(),
            validateStatus: () => true,
        });
    }

    set log_level(level: "error" | "warn" | "info" | "http" | "debug" | "silent") {
        if (level === "silent") {
            this.#logger.silent = true;
            this.#logger.level = "error";
            return;
        }

        this.#logger.silent = false;
        this.#logger.level = level;
    }

    set cache_ttl(ttl: number) {
        this.#cache.options.stdTTL = ttl;
        this.#logger.info(`TTL set to ${ttl === 0 ? "infinity" : ttl}s`);
    }

    flush() {
        this.#cache.flushStats();
        this.#cache.flushAll();
    }

    async #login() {
        if (this.#session) return;

        const cerdentials = qs.stringify({
            username: this.username,
            password: this.#password,
        });

        try {
            this.#logger.http("POST /login");
            const res = await this.#axios.post("/login", cerdentials, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (res.status !== 200 || !res.data.success || !res.headers["set-cookie"]) {
                this.#session = "";
                throw new Error("Failed to initialize session");
            }

            const cookies = res.headers["set-cookie"];
            this.#session = cookies.at(-1) || cookies[0];
            this.#logger.info("Session initialized");
        } catch (err) {
            this.#logger.error("Login failed:");
            this.#logger.error(err);
            throw err;
        }
    }

    async #get<T>(path: string, params?: unknown) {}
}
