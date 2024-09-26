import type * as T from "./types.js";
import { ProxyAgent } from "proxy-agent";
import { createLogger } from "./logger.js";
import { Mutex } from "async-mutex";
import qs from "qs";
import urljoin from "url-join";
import axios from "axios";
import cache from "node-cache";

export class Panel {
    readonly host: string;
    readonly port: number;
    readonly protocol: string;
    readonly path: string;
    readonly username: string;
    private readonly password: string;
    private readonly logger;
    private readonly cache = new cache();
    private readonly axios;
    private readonly mutex = new Mutex();
    private cookie: string = "";

    constructor(uri: string) {
        const url = new URL(encodeURI(uri));
        this.protocol = url.protocol.slice(0, -1);
        this.host = url.hostname;
        this.port = url.port.length ? Number(url.port) : this.protocol === "https" ? 443 : 80;
        this.path = url.pathname;
        this.username = decodeURIComponent(url.username);
        this.password = decodeURIComponent(url.password);

        this.logger = createLogger(`[${this.host}][${this.username}]`);
        this.logger.silent = true;
        this.cache.options.stdTTL = 10;

        this.axios = axios.create({
            baseURL: urljoin(`${this.protocol}://${this.host}:${this.port}`, this.path),
            proxy: false,
            httpAgent: new ProxyAgent(),
            httpsAgent: new ProxyAgent(),
            validateStatus: () => true,
            headers: {
                Accept: "application/json",
            },
        });
    }

    /**
     * Logger status
     */
    set debug(enable: boolean) {
        this.logger.silent = !enable;
    }

    /**
     * Cache standard time to live in seconds.
     * 0 = infinity
     */
    set stdTTL(ttl: number) {
        this.cache.options.stdTTL = ttl;
    }

    private async login() {
        if (this.cookie.length) {
            return;
        }

        const cerdentials = qs.stringify({
            username: this.username,
            password: this.password,
        });

        this.logger.debug("POST /login");
        const response = await this.axios
            .post("/login", cerdentials, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            })
            .catch(() => {});

        if (
            !response ||
            response.status !== 200 ||
            !response.data.success ||
            !response.headers["set-cookie"]
        ) {
            this.logger.error("Failed to initialize session.");
            throw new Error("Failed to initialize session.");
        }

        this.cookie = response.headers["set-cookie"][0];
        this.logger.info(`Logged-in`);
    }

    private async get<T>(path: string, params?: unknown) {
        await this.login();

        const url = urljoin("/panel/api/inbounds", path);
        this.logger.debug(`GET ${url}`);

        const response = await this.axios
            .get(url, {
                data: qs.stringify(params),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                    Cookie: this.cookie,
                },
            })
            .catch(() => {});

        if (!response || response.status !== 200 || !response.data.success) {
            this.logger.error(`${path} have failed.`);
            throw new Error(`${path} have failed.`);
        }

        return response.data.obj as T;
    }

    private async post<T>(path: string, params?: unknown) {
        await this.login();

        const url = urljoin("/panel/api/inbounds", path);
        this.logger.debug(`POST ${url}`);

        const data = JSON.stringify(params);
        const response = await this.axios
            .post(url, data, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Cookie: this.cookie,
                },
            })
            .catch((err) => {
                this.logger.error(err);
            });

        if (!response || response.status !== 200 || !response.data.success) {
            this.logger.error(`${path} have failed.`);
            throw new Error(`${path} have failed.`);
        }

        return response.data.obj as T;
    }

    private cacheInbound(inbound: T.Inbound) {
        this.cache.set(`inbound:${inbound.id}`, inbound);
        this.logger.debug(`Inbound ${inbound.id} saved in cache.`);

        if (inbound.settings) {
            const settings = JSON.parse(inbound.settings) as {
                clients: T.ClientOptions[];
            };

            if (settings && settings.clients) {
                settings.clients.map((options) => {
                    let clientId: string = "";
                    if ("id" in options) clientId = options.id;
                    if ("password" in options) clientId = options.password;

                    this.cache.set(`client:options:${options.email}`, options);
                    this.cache.set(`client:id:${options.email}`, clientId);
                    this.cache.set(`client:options:${clientId}`, options);
                });
            }
        }

        if (inbound.clientStats) {
            inbound.clientStats.map((client) => {
                const clientId = this.cache.get(`client:id:${client.email}`);
                if (clientId) this.cache.set(`client:${clientId}`, client);
                this.cache.set(`client:${client.email}`, client);
            });
        }
    }

    async flushCache() {
        this.cache.flushStats();
        this.cache.flushAll();
    }

    async getInbounds() {
        const release = await this.mutex.acquire();

        // cache hit
        if (this.cache.get("inbounds")) {
            release();
            this.logger.debug("Inbounds loaded from cache.");
            return this.cache.get("inbounds") as T.Inbound[];
        }

        // cache miss
        const inbounds = await this.get<T.Inbound[]>("/list");
        this.cache.set("inbounds", inbounds);
        inbounds.map((inbound) => this.cacheInbound(inbound));

        release();
        this.logger.debug("Inbounds loaded from API.");
        return inbounds;
    }

    async getInbound(id: number) {
        const release = await this.mutex.acquire();

        // cache hit
        if (this.cache.get(`inbound:${id}`)) {
            release();
            this.logger.debug(`Inbound ${id} loaded from cache.`);
            return this.cache.get(`inbound:${id}`) as T.Inbound;
        }

        // cache miss
        const inbound = await this.get<T.Inbound>(`/get/${id}`).catch(() => {});
        if (!inbound) {
            release();
            this.logger.debug(`Inbound ${id} not founded.`);
            return null;
        }

        this.cacheInbound(inbound);
        release();
        this.logger.debug(`Inbound ${id} loaded from API.`);
        return inbound;
    }

    async addInbound(options: T.InboundOptions) {
        const release = await this.mutex.acquire();

        try {
            this.logger.debug(`Adding inbound ${options.remark}.`);
            const inbound = await this.post<T.Inbound>("/add", options);
            this.flushCache();
            this.logger.info(`Inbound ${inbound.remark} added.`);
            return inbound;
        } catch (err) {
            this.logger.warn("Couldn't add inbound.");
            return null;
        } finally {
            release();
        }
    }

    async updateInbound(id: number, options: Partial<T.InboundOptions>) {
        const release = await this.mutex.acquire();

        try {
            this.logger.debug(`Updating inbound ${id}.`);
            const inbound = await this.getInbound(id);
            if (!inbound) throw new Error("Inbound not found.");
            options = { ...inbound, ...options };
            const updated = await this.post<T.Inbound>(`/update/${id}`, options);
            this.flushCache();
            this.logger.info(`Inbound ${id} updated.`);
            return updated;
        } catch (err) {
            this.logger.warn("Couldn't update inbound.");
            return null;
        } finally {
            release();
        }
    }

    async resetInboundsStat() {
        const release = await this.mutex.acquire();

        try {
            await this.post(`/resetAllTraffics`).catch(() => {});
            this.logger.debug("Inbounds stat reseted.");
            this.flushCache();
            return true;
        } catch (err) {
            this.logger.warn("Couldn't reset the inbounds stat.");
            return false;
        } finally {
            release();
        }
    }

    async resetInboundStat(id: number) {
        const release = await this.mutex.acquire();

        try {
            await this.post(`/resetAllClientTraffics/${id}`).catch(() => {});
            this.logger.debug(`Inbound ${id} stat reseted.`);
            this.flushCache();
            return true;
        } catch (err) {
            this.logger.warn(`Couldn't reset the inbound ${id} stat.`);
            return false;
        } finally {
            release();
        }
    }

    async deleteInbound(id: number) {
        const release = await this.mutex.acquire();

        try {
            await this.post(`/del/${id}`).catch(() => {});
            this.logger.debug(`Inbound ${id} deleted.`);
            this.flushCache();
            return true;
        } catch (err) {
            this.logger.warn(`Couldn't delete the inbound ${id}.`);
            return false;
        } finally {
            release();
        }
    }

    async getClient(email: string) {
        const release = await this.mutex.acquire();

        // cache hit
        if (this.cache.get(`client:${email}`)) {
            release();
            this.logger.debug(`Client ${email} loaded from cache.`);
            return this.cache.get(`client:${email}`) as T.Client;
        }

        // cache miss
        const client = await this.get<T.Client>(`/getClientTraffics/${email}`);
        if (client) {
            this.cache.set(`client:${email}`, client);
            this.logger.debug(`Client ${email} loaded from API.`);
            release();
            return client;
        }

        // search all inbounds
        this.logger.debug(`Try to find client ${email} in inbounds.`);
        release();
        await this.getInbounds();
        if (this.cache.get(`client:${email}`)) {
            this.logger.debug(`Client id ${email} loaded from inbounds.`);
            return this.cache.get(`client:${email}`) as T.Client;
        }

        return null;
    }

    async getClientOptions(email: string) {
        // cache hit
        if (this.cache.get(`client:options:${email}`)) {
            this.logger.debug(`Client ${email} options loaded from cache.`);
            return this.cache.get(`client:options:${email}`) as T.ClientOptions;
        }

        // cache miss
        await this.getInbounds();
        if (this.cache.get(`client:options:${email}`)) {
            this.logger.debug(`Client ${email} options loaded from cache.`);
            return this.cache.get(`client:options:${email}`) as T.ClientOptions;
        }

        return null;
    }

    async addClient(inboundId: number, options: T.ClientOptions) {
        const release = await this.mutex.acquire();
        await this.post("/addClient", {
            id: inboundId,
            settings: JSON.stringify({
                clients: [options],
            }),
        });

        this.flushCache();
        this.logger.debug(`Client ${options.email} added.`);
        release();
    }

    async addClients(inboundId: number, clients: T.ClientOptions[]) {
        const release = await this.mutex.acquire();
        await this.post("/addClient", {
            id: inboundId,
            settings: JSON.stringify({ clients }),
        });

        this.flushCache();
        this.logger.debug(`${clients.length} clients added.`);
        release();
    }

    async updateClient(inboundId: number, clientId: string, options: Partial<T.ClientOptions>) {
        await this.getInbound(inboundId);
        const defaultOptions = await this.getClientOptions(clientId);
        if (!defaultOptions) {
            this.logger.warn(`Client ${clientId} not found to be updated.`);
            return false;
        }

        const release = await this.mutex.acquire();
        await this.post(`/updateClient/${clientId}`, {
            id: inboundId,
            settings: JSON.stringify({
                clients: [
                    {
                        ...defaultOptions,
                        ...options,
                    },
                ],
            }),
        });

        this.flushCache();
        this.logger.debug(`Client ${clientId} updated.`);
        release();
        return true;
    }

    async updateClients(inboundId: number, clients: T.ClientUpdate[]) {
        await this.getInbound(inboundId);

        const defaults: Record<string, T.ClientOptions> = {};
        for (const client of clients) {
            const defaultOptions = await this.getClientOptions(client.id);
            if (!defaultOptions) continue;
            defaults[client.id] = defaultOptions;
        }

        const release = await this.mutex.acquire();
        for (const client of clients) {
            const defaultOptions = defaults[client.id];
            if (!defaultOptions) continue;

            await this.post(`/updateClient/${client.id}`, {
                id: inboundId,
                settings: JSON.stringify({
                    clients: [
                        {
                            ...defaultOptions,
                            ...client.options,
                        },
                    ],
                }),
            });

            this.logger.debug(`Client ${client.id} updated.`);
        }

        this.flushCache();
        this.logger.debug(`${clients.length} clients were updated.`);
        release();
    }

    async getClientIps(email: string) {
        if (this.cache.get(`client:ips:${email}`)) {
            this.logger.debug(`Client ${email} IPs loaded from cache.`);
            return this.cache.get(`client:ips:${email}`) as string[];
        }

        const data = await this.post<string>(`/clientIps/${email}`).catch(() => {});
        if (!data || data === "No IP Record") {
            this.logger.debug(`Client ${email} has no IPs.`);
            return [];
        }

        const ips = data.split(/,|\s/gm).filter((ip) => ip.length);
        this.cache.set(`client:ips:${email}`, ips);
        this.logger.debug(`Client ${email} IPs loaded from API.`);
        return ips;
    }

    async resetClientIps(email: string) {
        try {
            await this.post(`/clearClientIps/${email}`);
            this.cache.del(`client:ips:${email}`);
            this.logger.debug(`Client ${email} IPs reseted.`);
            return true;
        } catch (err) {
            this.logger.warn(`Couldn't reset the client ${email} ips.`);
            this.logger.error(err);
            return false;
        }
    }

    async resetClientStat(inboundId: number, email: string) {
        const release = await this.mutex.acquire();

        try {
            await this.post(`/${inboundId}/resetClientTraffic/${email}`);
            this.flushCache();
            this.logger.debug(`Client ${email} stat reseted.`);
            return true;
        } catch (err) {
            this.logger.warn(`Couldn't reset the client ${email} stat.`);
            this.logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async deleteClient(inboundId: number, id: string) {
        const options = await this.getClientOptions(id);
        if (!options) return;

        const release = await this.mutex.acquire();

        try {
            let clientId = options.email;
            if ("id" in options) clientId = options.id;
            if ("password" in options) clientId = options.password;

            await this.post(`/${inboundId}/delClient/${clientId}`).catch(() => {});
            this.flushCache();
            this.logger.debug(`Client ${options.email} deleted.`);
            return true;
        } catch (err) {
            this.logger.warn(`Couldn't delete the client ${id}.`);
            this.logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async deleteDepletedClients() {
        const release = await this.mutex.acquire();

        try {
            await this.post("/delDepletedClients");
            this.flushCache();
            this.logger.debug(`Depleted clients deleted.`);
        } catch (err) {
            this.logger.warn(`Couldn't delete the depleted clients.`);
            this.logger.error(err);
        } finally {
            release();
        }
    }

    async deleteInboundDepletedClients(inboundId: number) {
        const release = await this.mutex.acquire();

        try {
            await this.post(`/delDepletedClients/${inboundId}`);
            this.flushCache();
            this.logger.debug(`Depleted clients deleted.`);
            return true;
        } catch (err) {
            this.logger.warn(`Couldn't delete the depleted clients of inbound ${inboundId}.`);
            this.logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async getOnlineClients() {
        if (this.cache.get("clients:online")) {
            this.logger.debug("Online clients loaded from cache.");
            return this.cache.get("clients:online") as string[];
        }

        const emails = await this.post<string[]>("/onlines").catch(() => {});
        if (!emails) {
            this.logger.error("Failed to load online clients.");
            return [];
        }

        this.cache.set("clients:online", emails);
        this.logger.debug("Online clients loaded from API.");
        return emails;
    }

    async exportDatabase() {
        await this.get<string>("/createbackup").catch(() => {});
        this.logger.debug("Database exported.");
    }
}
