import { Mutex } from "async-mutex";
import Axios, { AxiosInstance } from "axios";
import NodeCache from "node-cache";
import { ProxyAgent } from "proxy-agent";
import winston from "winston";
import { createLogger } from "../utils/createLogger.js";
import { parseUrl } from "../utils/parseUrl.js";

export class API {
    readonly host: string;
    readonly port: number;
    readonly protocol: string;
    readonly path: string;
    readonly username: string;
    readonly password: string;
    readonly mutex: Mutex;
    readonly cache: NodeCache;
    readonly logger: winston.Logger;
    readonly axios: AxiosInstance;

    #session: string;

    constructor(uri: string) {
        const schema = parseUrl(uri);
        this.protocol = schema.protocol;
        this.host = schema.host;
        this.port = schema.port;
        this.path = schema.path;
        this.username = schema.username;
        this.password = schema.password;

        this.mutex = new Mutex();

        this.cache = new NodeCache();
        this.cache.options.stdTTL = 10;

        this.logger = createLogger(`[API][${this.host}]`);
        this.logger.silent = true;

        this.#session = "";
        this.axios = Axios.create({
            baseURL: schema.endpoint,
            proxy: false,
            httpAgent: new ProxyAgent(),
            httpsAgent: new ProxyAgent(),
            validateStatus: () => true,
        });
    }
}
