import type { Inbound, InboundOptions } from "$lib/types/inbound";
import type { Client, ClientOptions } from "$lib/types";
import { createLogger } from "$lib/logger";
import { decodeUri } from "$lib/utils/decodeUri";
import { parseInbound } from "$lib/utils/parseInbound";
import { Mutex } from "async-mutex";
import { ProxyAgent } from "proxy-agent";
import NodeCache from "node-cache";
import Axios from "axios";
import urlJoin from "url-join";
import qs from "qs";
import { stringifySettings } from "$lib/utils/stringifySettings";

export class Api {
    readonly host: string;
    readonly port: number;
    readonly protocol: string;
    readonly path: string;
    readonly username: string;
    private readonly _password: string;
    private readonly _logger;
    private readonly _cache;
    private readonly _axios;
    private readonly _mutex;
    private _cookie;

    constructor(uri: string) {
        const xui = decodeUri(uri);
        this.protocol = xui.protocol;
        this.host = xui.host;
        this.port = xui.port;
        this.path = xui.path;
        this.username = xui.username;
        this._password = xui.password;

        this._logger = createLogger(`[API][${this.host}]`);
        this._logger.silent = true;

        this._cache = new NodeCache();
        this._cache.options.stdTTL = 10;

        this._mutex = new Mutex();
        this._cookie = "";

        this._axios = Axios.create({
            baseURL: xui.endpoint,
            proxy: false,
            httpAgent: new ProxyAgent(),
            httpsAgent: new ProxyAgent(),
            validateStatus: () => true,
        });
    }

    set debug(enable: boolean) {
        this._logger.silent = !enable;
    }

    set stdTTL(ttl: number) {
        this._cache.options.stdTTL = ttl;
        this._logger.info(`Cache ttl set to ${ttl === 0 ? "infinity" : ttl}s`);
    }

    flushCache() {
        this._cache.flushStats();
        this._cache.flushAll();
    }

    private async login() {
        if (this._cookie) {
            return;
        }

        const cerdentials = qs.stringify({
            username: this.username,
            password: this._password,
        });

        try {
            this._logger.debug("POST /login");
            const response = await this._axios.post("/login", cerdentials, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (
                response.status !== 200 ||
                !response.data.success ||
                !response.headers["set-cookie"]
            ) {
                this._cookie = "";
                this._logger.error("Failed to initialize session");
                throw new Error("Failed to initialize session");
            }

            const cookies = response.headers["set-cookie"];
            this._cookie = cookies.at(-1) || cookies[0];
            this._logger.info("Session initialized");
        } catch (err) {
            this._logger.warn(`BaseUrl: ${this._axios.defaults.baseURL}`);
            this._logger.warn(`Username: ${this.username}`);
            this._logger.warn(`Password: ${this._password}`);

            if (err instanceof Axios.AxiosError) {
                this._logger.http(err);
                this._logger.error("Failed to initialize session");
            }

            throw err;
        }
    }

    private async get<T>(path: string, params?: unknown) {
        const endpoint = urlJoin("/panel/api/inbounds", path);
        this._logger.debug(`GET ${endpoint}`);

        try {
            await this.login();
            const response = await this._axios.get(endpoint, {
                data: qs.stringify(params),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                    Cookie: this._cookie,
                },
            });

            if (response.status !== 200 || !response.data.success) {
                this._logger.error(`${path} have failed.`);
                throw new Error(`${path} have failed.`);
            }

            return response.data.obj as T;
        } catch (err) {
            if (err instanceof Axios.AxiosError) {
                this._logger.http(err);
                this._logger.error(`GET request failed: ${endpoint}`);
            }

            throw err;
        }
    }

    private async post<T>(path: string, params?: unknown) {
        const endpoint = urlJoin("/panel/api/inbounds", path);

        try {
            await this.login();
            this._logger.debug(`POST ${endpoint}`);
            const response = await this._axios.post(endpoint, params, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Cookie: this._cookie,
                },
            });

            if (response.status !== 200 || !response.data.success) {
                this._logger.http(response.data);
                this._logger.error(`${endpoint} have failed.`);
                throw new Error(`${endpoint} have failed.`);
            }

            return response.data.obj as T;
        } catch (err) {
            if (err instanceof Axios.AxiosError) {
                this._logger.http(err);
                this._logger.error(`POST request failed: ${endpoint}`);
            }

            throw err;
        }
    }

    private async cacheInbound(inbound: Inbound) {
        this._logger.debug(`Inbound ${inbound.id} saved in cache.`);
        this._cache.set(`inbound:${inbound.id}`, inbound);

        if (typeof inbound.settings !== "object") {
            this._logger.debug(`Inbound ${inbound.id} has no settings.`);
            return;
        }

        const settingKeys = Object.keys(inbound.settings);
        const hasClients = settingKeys.includes("clients");
        if (!hasClients) return;

        // @ts-ignore
        inbound.settings.clients?.forEach((client) => {
            let clientId: string = client.email || "";
            if ("id" in client) clientId = client.id;
            if ("password" in client) clientId = client.password;
            if (clientId === "") return;

            this._cache.set(`client:id:${client.email}`, clientId);
            this._cache.set(`client:options:${clientId}`, client);
            this._cache.set(`client:options:${client.email}`, client);
        });

        if (!inbound.clientStats) return;
        inbound.clientStats.forEach((client) => {
            const clientId = this._cache.get(`client:id:${client.email}`);
            if (clientId) this._cache.set(`client:stat:${clientId}`, client);
            this._cache.set(`client:stat:${client.email}`, client);
        });
    }

    async checkHealth() {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug("Checking health...");
            await this.get<Inbound[]>("/list");
            this._logger.debug("Health check passed.");
            return true;
        } catch (err) {
            this._logger.warn("Health check failed.");
            return false;
        } finally {
            release();
        }
    }

    async getInbounds() {
        if (this._cache.has("inbounds")) {
            this._logger.debug("Inbounds loaded from cache.");
            return this._cache.get("inbounds") as Inbound[];
        }

        const release = await this._mutex.acquire();

        try {
            this._logger.debug("Fetching inbounds...");
            const inbounds = await this.get<Inbound[]>("/list");
            this._cache.set("inbounds", inbounds);
            this._logger.debug("Inbounds loaded from API.");
            return inbounds.map((inbound) => {
                const result = parseInbound(inbound);
                this.cacheInbound(result);
                return result;
            });
        } catch (err) {
            this._logger.error("Failed to fetch inbounds.");
            return [];
        } finally {
            release();
        }
    }

    async getInbound(id: number) {
        if (this._cache.has(`inbound:${id}`)) {
            this._logger.debug(`Inbound ${id} loaded from cache.`);
            return this._cache.get(`inbound:${id}`) as Inbound;
        }

        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Fetching inbound ${id}...`);
            const inbound = await this.get<Inbound>(`/get/${id}`);
            this._logger.debug(`Inbound ${id} loaded from API.`);
            const result = parseInbound(inbound);
            this.cacheInbound(result);
            return result;
        } catch (err) {
            this._logger.error(err);
            return null;
        } finally {
            release();
        }
    }

    async addInbound(options: InboundOptions) {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Adding inbound ${options.remark}.`);
            const inbound = await this.post<Inbound>("/add", {
                ...options,
                settings: stringifySettings(options.settings),
                streamSettings: stringifySettings(options.streamSettings),
                sniffing: stringifySettings(options.sniffing),
            });
            this._logger.info(`Inbound ${inbound.remark} added.`);
            this.flushCache();
            const result = parseInbound(inbound);
            this.cacheInbound(result);
            return result;
        } catch (err) {
            this._logger.error(err);
            return null;
        } finally {
            release();
        }
    }

    async updateInbound(id: number, options: Partial<InboundOptions>) {
        const oldInbound = await this.getInbound(id);
        if (!oldInbound) {
            this._logger.warn(`Inbound ${id} not found. Skipping update.`);
            return null;
        }

        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Updating inbound ${id}.`);
            const data = { ...oldInbound, ...options };
            const inbound = await this.post<Inbound>(`/update/${id}`, {
                ...data,
                settings: JSON.stringify(data.settings),
                streamSettings: JSON.stringify(data.streamSettings),
                sniffing: JSON.stringify(data.sniffing),
            });

            this._logger.info(`Inbound ${inbound.remark} updated.`);
            this.flushCache();
            const result = parseInbound(inbound);
            this.cacheInbound(result);
            return result;
        } catch (err) {
            this._logger.error(err);
            return null;
        } finally {
            release();
        }
    }

    async resetInboundsStat() {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug("Resetting inbounds stat...");
            await this.post(`/resetAllTraffics`);
            this.flushCache();
            this._logger.info("Inbounds stat reseted.");
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async resetInboundStat(id: number) {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Resetting inbound ${id} stat...`);
            await this.post(`/resetAllClientTraffics/${id}`);
            this.flushCache();
            this._logger.info(`Inbound ${id} stat reseted.`);
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async deleteInbound(id: number) {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Deleting inbound ${id}.`);
            await this.post(`/del/${id}`);
            this._logger.info(`Inbound ${id} deleted.`);
            this.flushCache();
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async getClient(clientId: string) {
        if (this._cache.has(`client:stat:${clientId}`)) {
            this._logger.debug(`Client ${clientId} loaded from cache.`);
            return this._cache.get(`client:stat:${clientId}`) as Client;
        }

        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Fetching client ${clientId}...`);
            const fetchEndpoint = `/getClientTraffics/${clientId}`;
            const client = await this.get<Client>(fetchEndpoint);
            if (client) {
                this._logger.debug(`Client ${clientId} loaded from API.`);
                this._cache.set(`client:stat:${clientId}`, client);
                return client;
            }
        } catch (err) {
            this._logger.error(err);
            return null;
        } finally {
            release();
        }

        this._logger.debug(`Fetching client ${clientId} from inbounds...`);
        await this.getInbounds();

        if (this._cache.has(`client:stat:${clientId}`)) {
            this._logger.debug(`Client ${clientId} loaded from cache.`);
            return this._cache.get(`client:stat:${clientId}`) as Client;
        }

        return null;
    }

    async getClientOptions(clientId: string) {
        if (this._cache.has(`client:options:${clientId}`)) {
            this._logger.debug(`Client ${clientId} options loaded from cache.`);
            return this._cache.get(`client:options:${clientId}`) as ClientOptions;
        }

        await this.getInbounds();
        if (this._cache.has(`client:options:${clientId}`)) {
            this._logger.debug(`Client ${clientId} options loaded from cache.`);
            return this._cache.get(`client:options:${clientId}`) as ClientOptions;
        }

        return null;
    }

    async addClient(inboundId: number, options: ClientOptions) {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Adding client ${options.email}.`);
            await this.post<Client>("/addClient", {
                id: inboundId,
                settings: JSON.stringify({
                    clients: [options],
                }),
            });
            this._logger.info(`Client ${options.email} added.`);
            this.flushCache();
            return this.getClient(options.email);
        } catch (err) {
            this._logger.error(err);
            return null;
        } finally {
            release();
        }
    }

    async updateClient(clientId: string, options: Partial<ClientOptions>) {
        this._logger.debug(`Updating client ${clientId}.`);

        const oldClient = await this.getClient(clientId);
        const oldClientOptions = await this.getClientOptions(clientId);
        if (!oldClient || !oldClientOptions) {
            this._logger.warn(`Client ${clientId} not found. Skipping update.`);
            return null;
        }

        const release = await this._mutex.acquire();

        try {
            let id: string = "";
            if ("id" in oldClientOptions) id = oldClientOptions.id;
            if ("password" in oldClientOptions) id = oldClientOptions.password;

            await this.post<Client>(`/updateClient/${id}`, {
                id: oldClient.inboundId,
                settings: JSON.stringify({
                    clients: [
                        {
                            ...oldClientOptions,
                            ...options,
                        },
                    ],
                }),
            });

            this._logger.info(`Client ${clientId} updated.`);
            this.flushCache();
            return this.getClient(clientId);
        } catch (err) {
            this._logger.error(err);
            return null;
        } finally {
            release();
        }
    }

    async deleteClient(clientId: string) {
        this._logger.debug(`Deleting client ${clientId}.`);

        const client = await this.getClient(clientId);
        const options = await this.getClientOptions(clientId);
        if (!client || !options) {
            this._logger.warn(`Client ${clientId} not found. Skipping.`);
            return;
        }

        const release = await this._mutex.acquire();

        try {
            let id = options.email;
            if ("id" in options) id = options.id;
            if ("password" in options) id = options.password;
            await this.post(`/${client.inboundId}/delClient/${id}`);
            this.flushCache();
            this._logger.info(`Client ${clientId} deleted.`);
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async getClientIps(clientId: string) {
        this._logger.debug(`Fetching client ${clientId} ips...`);

        if (this._cache.has(`client:ips:${clientId}`)) {
            this._logger.debug(`Client ${clientId} ips loaded from cache.`);
            return this._cache.get(`client:ips:${clientId}`) as string[];
        }

        const client = await this.getClient(clientId);
        if (!client) {
            this._logger.warn(`Client ${clientId} not found. Skipping.`);
            return [];
        }

        const release = await this._mutex.acquire();

        try {
            const data = await this.post<string>(`/clientIps/${client.email}`);
            if (data === "No IP Record") {
                this._logger.debug(`Client ${clientId} has no IPs.`);
                return [];
            }

            const ips = data.split(/,|\s/gm).filter((ip) => ip.length);
            this._cache.set(`client:ips:${client.email}`, ips);
            this._cache.set(`client:ips:${clientId}`, ips);
            this._logger.debug(`Client ${clientId} ips loaded from API.`);
            return ips;
        } catch (err) {
            this._logger.error(err);
            return [];
        } finally {
            release();
        }
    }

    async resetClientIps(clientId: string) {
        this._logger.debug(`Resetting client ${clientId} ips...`);
        const client = await this.getClient(clientId);
        if (!client) {
            this._logger.warn(`Client ${clientId} not found. Skipping.`);
            return false;
        }

        const release = await this._mutex.acquire();

        try {
            await this.post(`/clearClientIps/${client.email}`);
            this._cache.del(`client:ips:${client.email}`);
            this._cache.del(`client:ips:${clientId}`);
            this._logger.debug(`Client ${clientId} ips reseted.`);
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async resetClientStat(clientId: string) {
        this._logger.debug(`Resetting client ${clientId} stat...`);

        const client = await this.getClient(clientId);
        if (!client) {
            this._logger.warn(`Client ${clientId} not found. Skipping.`);
            return false;
        }

        const release = await this._mutex.acquire();

        try {
            const inboundId = client.inboundId;
            await this.post(`/${inboundId}/resetClientTraffic/${client.email}`);
            this._logger.info(`Client ${client.email} stat reseted.`);
            this.flushCache();
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async deleteDepletedClients() {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Deleting depleted clients...`);
            await this.post("/delDepletedClients/-1");
            this.flushCache();
            this._logger.info(`Depleted clients deleted.`);
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async deleteInboundDepletedClients(inboundId: number) {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug(`Deleting depleted clients of inbound ${inboundId}...`);
            await this.post(`/delDepletedClients/${inboundId}`);
            this.flushCache();
            this._logger.info(`Depleted clients of inbound ${inboundId} deleted.`);
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }

    async getOnlineClients() {
        if (this._cache.has("clients:online")) {
            this._logger.debug("Online clients loaded from cache.");
            return this._cache.get("clients:online") as string[];
        }

        const release = await this._mutex.acquire();

        try {
            const emails = await this.post<string[]>("/onlines");
            this._cache.set("clients:online", emails);
            this._logger.debug("Online clients loaded from API.");
            return emails || [];
        } catch (err) {
            this._logger.error(err);
            return [];
        } finally {
            release();
        }
    }

    async sendBackup() {
        const release = await this._mutex.acquire();

        try {
            this._logger.debug("Sending backup...");
            await this.get<string>("/createbackup");
            this._logger.info("Backup sent.");
            return true;
        } catch (err) {
            this._logger.error(err);
            return false;
        } finally {
            release();
        }
    }
}
