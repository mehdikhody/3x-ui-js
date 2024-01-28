import { ProxyAgent } from "proxy-agent";
import { createLogger } from "../util/logger";
import { Api } from "./api";
import axios from "axios";
import qs from "qs";
import urljoin from "url-join";

export class Panel {
    public readonly host: string;
    public readonly port: number;
    public readonly protocol: string;
    public readonly path: string;
    private readonly logger;

    constructor(uri: string, debug = false) {
        const url = new URL(encodeURI(uri));

        this.host = url.hostname;
        this.port = url.port.length ? Number(url.port) : 80;
        this.protocol = url.protocol.slice(0, -1);
        this.path = url.pathname;

        this.logger = createLogger(`panel: ${this.host}`);
        this.logger.silent = !debug;

        this.logger.info(`Host: ${this.host}:${this.port}`);
        if (this.protocol !== "https") {
            this.logger.warn("Connection is not secure");
        }
    }

    async login(username: string, password: string) {
        const cerdentials = qs.stringify({ username, password });
        this.logger.debug(`trying to login via ${username}`);

        try {
            const response = await axios.post("/login", cerdentials, {
                baseURL: urljoin(
                    `${this.protocol}://${this.host}:${this.port}`,
                    this.path,
                ),
                validateStatus: () => true,
                httpAgent: new ProxyAgent(),
                httpsAgent: new ProxyAgent(),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                },
            });

            if (
                response.status !== 200 ||
                !response.data.success ||
                !response.headers["set-cookie"]
            ) {
                this.logger.error("Failed to initialize session.");
                throw new Error("Failed to initialize session.");
            }

            const cookie = response.headers["set-cookie"][0];
            this.logger.debug(`cookie: ${cookie}`);

            return new Api(this, cookie, !this.logger.silent);
        } catch (err) {
            this.logger.error("connection failed");
            throw new Error("connection failed");
        }
    }
}
