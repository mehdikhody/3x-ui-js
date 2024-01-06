import type { AxiosInstance } from "axios";
import { ProxyAgent } from "proxy-agent";
import EventEmitter from "events";
import urljoin from "url-join";
import cache from "node-cache";
import axios from "axios";
import qs from "qs";

type Client = {
    id: number;
    inboundId: number;
    enable: boolean;
    email: string;
    up: number;
    down: number;
    expiryTime: number;
    total: number;
};

type ClientOptionsForVmess = {
    id: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: string;
    subId?: string;
    reset?: number;
};

type ClientOptionsForVless = {
    id: string;
    flow?: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: string;
    subId?: string;
    reset?: number;
};

type ClientOptionsForTrojan = {
    password: string;
    flow?: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: string;
    subId?: string;
    reset?: number;
};

type ClientOptionsForShadowsocks = {
    method?: string;
    password: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: string;
    subId?: string;
    reset?: number;
};

type ClientOptions =
    | ClientOptionsForVmess
    | ClientOptionsForVless
    | ClientOptionsForTrojan
    | ClientOptionsForShadowsocks;

type Inbound = {
    id: number;
    up: number;
    down: number;
    total: number;
    remark: string;
    enable: boolean;
    expiryTime: number;
    clientStats: Client[];
    listen: string;
    port: number;
    protocol: string;
    settings: string;
    streamSettings: string;
    tag: string;
    sniffing: string;
};

type InboundOptions = {
    enable: boolean;
    remark: string;
    listen: string;
    port: number;
    protocol:
        | "vmess"
        | "vless"
        | "trojan"
        | "shadowsocks"
        | "dokodemo-door"
        | "socks"
        | "https"
        | string;
    expiryTime: number;
    settings: string;
    streamSettings: string;
    sniffing: string;
};

export class XUI extends EventEmitter {
    private readonly axios: AxiosInstance;
    private readonly cache: cache;
    private cookie: string;

    constructor(
        public readonly host: string,
        private readonly port: number,
        private readonly username: string,
        private readonly password: string,
        private readonly protocol: "http" | "https" = "http",
    ) {
        super();
        this.cache = new cache({ stdTTL: 5 });
        this.cookie = "";

        this.axios = axios.create({
            baseURL: `${protocol}://${host}:${port}`,
            validateStatus: () => true,
            httpAgent: new ProxyAgent(),
            httpsAgent: new ProxyAgent(),
        });
    }

    private async login() {
        if (this.cookie.length) {
            this.emit("login:cached");
            return;
        }

        const { username, password } = this;
        const cerdentials = qs.stringify({ username, password });
        const response = await this.axios
            .post("/login", cerdentials, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                },
            })
            .catch(() => {});

        if (
            !response ||
            response.status !== 200 ||
            !response.data.success ||
            !response.headers["set-cookie"]
        ) {
            this.emit("login:failed");
            throw new Error("Failed to initialize session.");
        }

        this.cookie = response.headers["set-cookie"][0];
        this.emit("login:success");
    }

    private async get<T>(path: string, data?: unknown) {
        const url = urljoin("/panel/api/inbounds", path);
        const response = await this.axios.get(url, {
            data: qs.stringify(data),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
                Cookie: this.cookie,
            },
        });

        if (response.status !== 200 || !response.data.success) {
            throw new Error(`Request to ${path} have failed.`);
        }

        return response.data.obj as T;
    }

    private async post<T>(path: string, data?: unknown) {
        const url = urljoin("/panel/api/inbounds", path);
        const response = await this.axios.post(url, JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Cookie: this.cookie,
            },
        });

        if (response.status !== 200 || !response.data.success) {
            throw new Error(`Request to ${path} have failed.`);
        }

        return response.data.obj as T;
    }

    async getInbounds() {
        if (this.cache.get("inbounds")) {
            this.emit("inbounds:cached");
            return this.cache.get("inbounds") as Inbound[];
        }

        await this.login();
        const inbounds = await this.get<Inbound[]>("/list");

        this.cache.set("inbounds", inbounds);
        inbounds.forEach((inbound) => {
            this.cache.set(`inbound:${inbound.id}`, inbound);
        });

        this.emit("inbounds:loaded");
        return inbounds;
    }

    async getInbound(id: number): Promise<Inbound | null> {
        if (this.cache.get(`inbound:${id}`)) {
            this.emit("inbound:cached");
            return this.cache.get(`inbound:${id}`) as Inbound;
        }

        await this.login();

        try {
            const inbound = await this.get<Inbound>(`/get/${id}`);
            this.cache.set(`inbound:${id}`, inbound);
            this.emit("inbound:loaded");
            return inbound;
        } catch (error) {
            this.emit("inbound:not-found");
            return null;
        }
    }

    async addInbound(options: InboundOptions) {
        await this.login();
        const inbound = await this.post<Inbound>("/add", options);
        this.cache.del("inbounds");
        this.cache.set(`inbound:${inbound.id}`, inbound);
        this.emit("inbound:added");
        return inbound;
    }

    async updateInbound(id: number, options: Partial<InboundOptions>) {
        await this.login();

        const inbound = await this.getInbound(id);
        if (!inbound) throw new Error("Inbound not found.");

        options = { ...inbound, ...options };

        const updated = await this.post<Inbound>(`/update/${id}`, options);
        this.cache.del("inbounds");
        this.cache.set(`inbound:${inbound.id}`, updated);

        this.emit("inbound:updated");
        return inbound;
    }

    async resetInboundsStat() {
        await this.login();

        try {
            await this.post(`/resetAllTraffics`);
            this.cache.flushAll();
            this.emit("inbounds:reset");
        } catch (error) {
            // nothing
            this.emit("inbounds:reset-failed");
        }
    }

    async resetInboundStat(id: number) {
        await this.login();

        try {
            await this.post(`/resetAllClientTraffics/${id}`);
            this.cache.del(`inbound:${id}`);
            this.emit("inbound:reset");
        } catch (error) {
            // nothing
            this.emit("inbound:reset-failed");
        }
    }

    async deleteInbound(id: number) {
        await this.login();

        try {
            await this.post(`/del/${id}`);
            this.cache.del(`inbound:${id}`);
            this.emit("inbound:deleted");
        } catch (error) {
            // nothing
            this.emit("inbound:delete-failed");
        }
    }

    async getClients() {
        if (this.cache.get("clients")) {
            this.emit("clients:cached");
            return this.cache.get("clients") as Client[];
        }

        await this.login();
        const inbounds = await this.getInbounds();
        const clients = inbounds.map((inbound) => inbound.clientStats).flat();

        this.cache.set("clients", clients);
        clients.forEach((client) => {
            this.cache.set(`client:${client.email}`, client);
        });

        this.emit("clients:loaded");
        return clients;
    }

    async getClient(email: string): Promise<Client | null> {
        if (this.cache.get(`client:${email}`)) {
            this.emit("client:cached");
            return this.cache.get(`client:${email}`) as Client;
        }

        await this.login();
        const client = await this.get<Client>(`/getClientTraffics/${email}`);
        this.cache.set(`client:${email}`, client);
        this.emit("client:loaded");
        return client;
    }

    async getClientByClientId(id: string) {
        if (this.cache.get(`client:${id}`)) {
            this.emit("client:cached");
            return this.cache.get(`client:${id}`) as Client;
        }

        const options = await this.getClientOptionsByClientId(id);
        if (!options) return null;

        const client = await this.getClient(options.email);
        if (!client) return null;

        this.cache.set(`client:${id}`, client);
        this.emit("client:loaded");
        return client;
    }

    async getClientIps(email: string) {
        if (this.cache.get(`client:${email}:ips`)) {
            this.emit("client:ips:cached");
            return this.cache.get(`client:${email}:ips`) as string[];
        }

        await this.login();

        try {
            const data = await this.post<string>(`/clientIps/${email}`);
            if (data === "No IP Record") return [];

            const ips = data.split(/,|\s/gm).filter((ip) => ip.length);
            this.cache.set(`client:${email}:ips`, ips);
            this.emit("client:ips:loaded");
            return ips;
        } catch (error) {
            this.emit("client:ips:not-found");
            return [];
        }
    }

    async getClientOptions(email: string) {
        if (this.cache.get(`client:${email}:options`)) {
            this.emit("client:options:cached");
            return this.cache.get(`client:${email}:options`) as ClientOptions;
        }

        await this.login();

        try {
            const client = await this.getClient(email);
            if (!client) throw new Error("Client not found.");

            const inbound = await this.getInbound(client.inboundId);
            if (!inbound) throw new Error("Inbound not found.");

            const options = JSON.parse(inbound.settings).clients.find(
                (client: ClientOptions) => client.email === email,
            );

            this.cache.set(`client:${email}:options`, options);
            this.emit("client:options:loaded");
            return options;
        } catch (error) {
            this.emit("client:options:not-found", error);
            return null;
        }
    }

    async getClientOptionsByClientId(id: string) {
        if (this.cache.get(`client:${id}:options`)) {
            this.emit("client:options:cached");
            return this.cache.get(`client:${id}:options`) as ClientOptions;
        }

        await this.login();

        try {
            const inbound = await this.getInbounds();
            const options = inbound
                .map((inbound) => JSON.parse(inbound.settings).clients)
                .flat()
                .find((client: ClientOptions) => {
                    return (
                        ("email" in client && client.email === id) ||
                        ("id" in client && client.id === id) ||
                        ("password" in client && client.password === id)
                    );
                });

            this.cache.set(`client:${id}:options`, options);
            this.emit("client:options:loaded");
            return options;
        } catch (error) {
            this.emit("client:options:not-found");
            return null;
        }
    }

    async addClient(inboundId: number, options: ClientOptions) {
        await this.login();
        await this.post("/addClient", {
            id: inboundId,
            settings: JSON.stringify({
                clients: [options],
            }),
        });

        this.cache.flushAll();
        this.emit("client:added");
    }

    async addClients(inboundId: number, clients: ClientOptions[]) {
        await this.login();
        await this.post("/addClient", {
            id: inboundId,
            settings: JSON.stringify({ clients }),
        });

        this.cache.flushAll();
        this.emit("clients:added");
    }

    async updateClient(
        inboundId: number,
        clientId: string,
        options: Partial<ClientOptions>,
    ) {
        await this.login();
        const defaultOptions = await this.getClientOptionsByClientId(clientId);
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
        this.emit("client:updated");
    }

    async resetClientIps(email: string) {
        await this.login();

        try {
            await this.post(`/clearClientIps/${email}`);
            this.cache.del(`client:${email}:ips`);
            this.emit("client:ips:reset");
        } catch (error) {
            this.emit("client:ips:reset-failed");
        }
    }

    async resetClientStat(inboundId: number, email: string) {
        await this.login();

        try {
            await this.post(`/${inboundId}/resetClientTraffic/${email}`);
            this.cache.flushAll();
            this.emit("client:reset");
        } catch (error) {
            this.emit("client:reset-failed");
        }
    }

    async deleteClient(inboundId: number, email: string) {
        await this.login();

        try {
            await this.post(`/${inboundId}/delClient/${email}`);
            this.cache.flushAll();
            this.emit("client:deleted");
        } catch (error) {
            this.emit("client:delete-failed");
        }
    }

    async deleteDepletedClients() {
        await this.login();

        try {
            await this.post("/delDepletedClients");
            this.cache.flushAll();
            this.emit("clients:deleted");
        } catch (error) {
            this.emit("clients:delete-failed");
        }
    }

    async deleteInboundDepletedClients(inboundId: number) {
        await this.login();

        try {
            await this.post(`/delDepletedClients/${inboundId}`);
            this.cache.flushAll();
            this.emit("clients:deleted");
        } catch (error) {
            this.emit("clients:delete-failed");
        }
    }

    async getOnlineClients() {
        if (this.cache.get("clients:online")) {
            this.emit("clients:online:cached");
            return this.cache.get("clients:online") as string[];
        }

        try {
            await this.login();
            const emails = await this.post<string[]>("/onlines");
            this.cache.set("clients:online", emails);
            return emails;
        } catch (err) {
            return [];
        }
    }

    async exportDatabase() {
        await this.login();
        const data = await this.get<string>("/createbackup");
        return data;
    }
}
