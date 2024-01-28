import type * as T from "../types";
import { ProxyAgent } from "proxy-agent";
import { createLogger } from "../util/logger";
import { Panel } from "./panel";
import cache from "node-cache";
import axios from "axios";
import urljoin from "url-join";
import qs from "qs";

export class Api {
    private readonly cache;
    private readonly logger;
    private readonly axios;

    constructor(
        public readonly panel: Panel,
        private readonly cookie: string,
        debug = false,
    ) {
        this.cache = new cache({ stdTTL: 5 });
        this.logger = createLogger(`api: ${this.panel.host}`);
        this.logger.silent = !debug;

        this.axios = axios.create({
            baseURL: urljoin(
                `${this.panel.protocol}://${this.panel.host}:${this.panel.port}`,
                this.panel.path,
            ),
            validateStatus: () => true,
            httpAgent: new ProxyAgent(),
            httpsAgent: new ProxyAgent(),
        });
    }

    setCacheTTL(ttl: number) {
        this.cache.options.stdTTL = ttl;
        this.logger.debug(`Cache TTL set to ${ttl} seconds.`);
    }

    private async get<T>(path: string, data?: unknown) {
        const url = urljoin("/panel/api/inbounds", path);
        this.logger.debug(`GET ${url}`);

        const response = await this.axios.get(url, {
            data: qs.stringify(data),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
                Cookie: this.cookie,
            },
        });

        if (response.status !== 200 || !response.data.success) {
            this.logger.error(`Request to ${path} have failed.`);
            throw new Error(`Request to ${path} have failed.`);
        }

        return response.data.obj as T;
    }

    private async post<T>(path: string, data?: unknown) {
        const url = urljoin("/panel/api/inbounds", path);
        this.logger.debug(`POST ${url}`);

        const response = await this.axios.post(url, JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Cookie: this.cookie,
            },
        });

        if (response.status !== 200 || !response.data.success) {
            this.logger.error(`Request to ${path} have failed.`);
            throw new Error(`Request to ${path} have failed.`);
        }

        return response.data.obj as T;
    }

    private saveInboundInCache(inbound: T.Inbound) {
        this.cache.set(`inbound:${inbound.id}`, inbound);
        this.logger.debug(`Inbound ${inbound.id} saved in cache.`);

        if (inbound.clientStats) {
            const settings = JSON.parse(inbound.settings) as {
                clients: T.ClientOptions[];
            };

            inbound.clientStats.map((client) => {
                const options = settings.clients.find(
                    (options: T.ClientOptions) =>
                        options.email === client.email,
                ) as T.ClientOptions;

                this.cache.set(`client:${client.email}:stat`, client);
                this.cache.set(`client:${client.email}:options`, options);

                let clientId: string = "";
                if ("id" in options) clientId = options.id;
                if ("password" in options) clientId = options.password;

                this.cache.set(`client:${clientId}:stat`, client);
                this.cache.set(`client:${clientId}:options`, options);

                this.logger.debug(`Client ${client.email} saved in cache.`);
            });
        }
    }

    async getInbounds() {
        if (this.cache.get("inbounds")) {
            this.logger.debug("Inbounds loaded from cache.");
            return this.cache.get("inbounds") as T.Inbound[];
        }

        const inbounds = await this.get<T.Inbound[]>("/list");

        this.cache.set("inbounds", inbounds);
        inbounds.map((inbound) => this.saveInboundInCache(inbound));

        this.logger.debug("Inbounds loaded from API.");
        return inbounds;
    }

    async getInbound(id: number) {
        if (this.cache.get(`inbound:${id}`)) {
            this.logger.debug(`Inbound ${id} loaded from cache.`);
            return this.cache.get(`inbound:${id}`) as T.Inbound;
        }

        try {
            const inbound = await this.get<T.Inbound>(`/get/${id}`);
            this.saveInboundInCache(inbound);

            this.logger.debug(`Inbound ${id} loaded from API.`);
            return inbound;
        } catch (error) {
            return null;
        }
    }

    async addInbound(options: T.InboundOptions) {
        this.logger.debug(`Adding inbound ${options.remark}.`);
        const inbound = await this.post<T.Inbound>("/add", options);
        this.cache.flushAll();
        return inbound;
    }

    async updateInbound(id: number, options: Partial<T.InboundOptions>) {
        this.logger.debug(`Updating inbound ${id}.`);

        const inbound = await this.getInbound(id);
        if (!inbound) throw new Error("Inbound not found.");

        options = { ...inbound, ...options };
        const updated = await this.post<T.Inbound>(`/update/${id}`, options);
        this.cache.flushAll();

        return updated;
    }

    async resetInboundsStat() {
        await this.post(`/resetAllTraffics`).catch(() => {});
        this.logger.debug("Inbounds stat reseted.");
        this.cache.flushAll();
    }

    async resetInboundStat(id: number) {
        await this.post(`/resetAllClientTraffics/${id}`).catch(() => {});
        this.logger.debug(`Inbound ${id} stat reseted.`);
        this.cache.flushAll();
    }

    async deleteInbound(id: number) {
        await this.post(`/del/${id}`).catch(() => {});
        this.logger.debug(`Inbound ${id} deleted.`);
        this.cache.flushAll();
    }

    async getClients() {
        const inbounds = await this.getInbounds();
        const clients = inbounds.map((inbound) => inbound.clientStats).flat();
        this.logger.debug("Clients loaded from cache.");
        return clients;
    }

    async getClient(email: string) {
        if (this.cache.get(`client:${email}:stat`)) {
            this.logger.debug(`Client ${email} loaded from cache.`);
            return this.cache.get(`client:${email}:stat`) as T.Client;
        }

        const client = await this.get<T.Client>(`/getClientTraffics/${email}`);
        this.cache.set(`client:${email}:stat`, client);
        this.logger.debug(`Client ${email} loaded from API.`);

        if (!client) {
            this.logger.debug(`Client email ${email} not found.`);
            await this.getInbounds();

            if (this.cache.get(`client:${email}:stat`)) {
                this.logger.debug(`Client id ${email} loaded from cache.`);
                return this.cache.get(`client:${email}:stat`) as T.Client;
            }
        }

        return client;
    }

    async getClientOptions(email: string) {
        await this.getInbounds();
        const options = this.cache.get(
            `client:${email}:options`,
        ) as T.ClientOptions;
        this.logger.debug(`Client ${email} options loaded from cache.`);
        return options;
    }

    async addClient(inboundId: number, options: T.ClientOptions) {
        await this.post("/addClient", {
            id: inboundId,
            settings: JSON.stringify({
                clients: [options],
            }),
        });

        this.cache.flushAll();
        this.logger.debug(`Client ${options.email} added.`);
    }

    async addClients(inboundId: number, clients: T.ClientOptions[]) {
        await this.post("/addClient", {
            id: inboundId,
            settings: JSON.stringify({ clients }),
        });

        this.cache.flushAll();
        this.logger.debug(`${clients.length} clients added.`);
    }

    async updateClient(
        inboundId: number,
        clientId: string,
        options: Partial<T.ClientOptions>,
    ) {
        await this.getInbound(inboundId);
        const defaultOptions = this.cache.get(
            `client:${clientId}:options`,
        ) as T.ClientOptions;

        const clientOptions = {
            ...defaultOptions,
            ...options,
        };

        await this.post(`/updateClient/${clientId}`, {
            id: inboundId,
            settings: JSON.stringify({
                clients: [clientOptions],
            }),
        });

        this.cache.flushAll();
        this.logger.debug(`Client ${clientId} updated.`);
    }

    async getClientIps(email: string) {
        if (this.cache.get(`client:${email}:ips`)) {
            this.logger.debug(`Client ${email} IPs loaded from cache.`);
            return this.cache.get(`client:${email}:ips`) as string[];
        }

        try {
            const data = await this.post<string>(`/clientIps/${email}`);
            if (data === "No IP Record") {
                this.logger.debug(`Client ${email} has no IPs.`);
                return [];
            }

            const ips = data.split(/,|\s/gm).filter((ip) => ip.length);
            this.cache.set(`client:${email}:ips`, ips);
            this.logger.debug(`Client ${email} IPs loaded from API.`);
            return ips;
        } catch (error) {
            return [];
        }
    }

    async resetClientIps(email: string) {
        await this.post(`/clearClientIps/${email}`).catch(() => {});
        this.cache.del(`client:${email}:ips`);
        this.logger.debug(`Client ${email} IPs reseted.`);
    }

    async resetClientStat(inboundId: number, email: string) {
        await this.post(`/${inboundId}/resetClientTraffic/${email}`).catch(
            () => {},
        );
        this.cache.flushAll();
        this.logger.debug(`Client ${email} stat reseted.`);
    }

    async deleteClient(inboundId: number, email: string) {
        await this.post(`/${inboundId}/delClient/${email}`).catch(() => {});
        this.cache.flushAll();
        this.logger.debug(`Client ${email} deleted.`);
    }

    async deleteDepletedClients() {
        await this.post("/delDepletedClients").catch(() => {});
        this.cache.flushAll();
        this.logger.debug(`Depleted clients deleted.`);
    }

    async deleteInboundDepletedClients(inboundId: number) {
        await this.post(`/delDepletedClients/${inboundId}`).catch(() => {});
        this.cache.flushAll();
        this.logger.debug(`Depleted clients deleted.`);
    }

    async getOnlineClients() {
        if (this.cache.get("clients:online")) {
            this.logger.debug("Online clients loaded from cache.");
            return this.cache.get("clients:online") as string[];
        }

        try {
            const emails = await this.post<string[]>("/onlines");
            this.cache.set("clients:online", emails);
            this.logger.debug("Online clients loaded from API.");
            return emails;
        } catch (err) {
            this.logger.error("Failed to load online clients.");
            return [];
        }
    }

    async exportDatabase() {
        await this.get<string>("/createbackup").catch(() => {});
        this.logger.debug("Database exported.");
    }
}
