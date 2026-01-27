import { Mutex } from "async-mutex";
import Axios, { AxiosInstance } from "axios";
import NodeCache from "node-cache";
import { ProxyAgent } from "proxy-agent";
import qs from "qs";
import urlJoin from "url-join";
import winston from "winston";
import { URI } from "./base/uri.js";
import { createLogger } from "./utils/createLogger.js";
import { XUI } from "./xui.js";

export class API {
    readonly #uri: URI;
    readonly #mutex: Mutex;
    readonly #axios: AxiosInstance;
    #session: string;

    readonly cache: NodeCache;
    readonly logger: winston.Logger;

    constructor(xui: XUI, uri: URI) {
        this.#uri = uri;
        this.#session = "";

        this.#mutex = new Mutex();

        this.cache = new NodeCache();
        this.cache.options.stdTTL = 10;

        this.logger = createLogger(`[XUI][${this.#uri.host}]`);
        this.logger.silent = true;

        this.#session = "";
        this.#axios = Axios.create({
            baseURL: this.#uri.endpoint,
            proxy: false,
            httpAgent: new ProxyAgent(),
            httpsAgent: new ProxyAgent(),
            validateStatus: () => true,
        });
    }

    async #login() {
        if (this.#session) return;

        const cerdentials = qs.stringify({
            username: this.#uri.username,
            password: this.#uri.password,
        });

        try {
            this.logger.http("POST /login");
            const res = await this.#axios.post("/login", cerdentials, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (res.status !== 200 || !res.headers["set-cookie"]) {
                this.#session = "";
                throw new Error("Failed to initialize session");
            }

            const cookies = res.headers["set-cookie"];
            this.#session = cookies.at(-1) || cookies[0];
            this.logger.info("Session initialized");
        } catch (err) {
            this.logger.error("Login failed:");
            this.logger.error(err);
            throw err;
        }
    }

    async get<T>(path: string, params?: unknown) {
        await this.#login();
        const release = await this.#mutex.acquire();

        try {
            path = urlJoin("/panel/api", path);

            this.logger.http(`GET ${path}`);
            const res = await this.#axios.get(path, {
                data: qs.stringify(params),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                    Cookie: this.#session,
                },
            });

            if (res.status !== 200 || !res.data.success) {
                throw new Error(res.data.msg);
            }

            return res.data.obj as T;
        } catch (err) {
            this.logger.error(`GET ${path} failed:`);
            this.logger.error(err);
            throw err;
        } finally {
            release();
        }
    }

    async post<T>(path: string, params?: unknown) {
        await this.#login();
        const release = await this.#mutex.acquire();

        try {
            path = urlJoin("/panel/api", path);

            this.logger.debug(`POST ${path}`);
            const res = await this.#axios.post(path, params, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Cookie: this.#session,
                },
            });

            if (res.status !== 200 || !res.data.success) {
                throw new Error(res.data.msg);
            }

            return res.data.obj as T;
        } catch (err) {
            this.logger.error(`POST ${path} failed:`);
            this.logger.error(err);
            throw err;
        } finally {
            release();
        }
    }
}
