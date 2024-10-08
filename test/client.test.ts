import { assert, expect, describe, beforeAll, afterAll, it } from "vitest";
import { randomUUID } from "crypto";
import { Api, ClientOptions } from "3x-ui";

const local = new Api("http://admin:admin@localhost:2053");
let inboundId = 0;

beforeAll(async () => {
    const inbounds = await local.getInbounds();
    const inbound = inbounds.find((inbound) => inbound.remark === "Client inbound");
    if (inbound) {
        inboundId = inbound.id;
        return;
    }

    const newInbound = await local.addInbound({
        enable: true,
        remark: "Client inbound",
        listen: "127.0.0.1",
        port: 48964,
        protocol: "vmess",
        expiryTime: 0,
        settings: {
            decryption: "none",
            fallbacks: [],
            clients: [
                {
                    id: "8841ba90-4734-4eba-bf7d-a9e1ad0c85f7",
                    email: "client@example.com",
                    enable: true,
                    expiryTime: 0,
                    limitIp: 0,
                    totalGB: 0,
                } as ClientOptions as any,
            ],
        },
        streamSettings: {
            network: "ws",
            security: "none",
            wsSettings: {},
        },
        sniffing: {
            enabled: true,
            destOverride: ["http", "tls"],
        },
    });

    assert(newInbound);
    expect(newInbound.remark).toBe("Client inbound");
    inboundId = newInbound.id;
});

afterAll(async () => {
    assert(inboundId);
    await local.deleteInbound(inboundId);
});

describe("Client", () => {
    const email = Math.random().toString(36).slice(2);
    const id = randomUUID();

    const email2 = Math.random().toString(36).slice(2);
    const id2 = randomUUID();

    it("Add Client", async () => {
        const client1 = await local.addClient(inboundId, {
            email: email,
            enable: true,
            expiryTime: Date.now() + Math.floor(Math.random() * 10) * 60 * 60 * 1000,
            id: id,
            limitIp: Math.floor(Math.random() * 10),
            subId: "",
            tgId: "",
            totalGB: Math.floor(Math.random() * 10) * 1024 * 1024 * 1024,
        });

        assert(client1);
        expect(client1.email).toBe(email);

        const client2 = await local.addClient(inboundId, {
            email: email2,
            enable: true,
            expiryTime: Date.now() + Math.floor(Math.random() * 10) * 60 * 60 * 1000,
            id: id2,
            limitIp: Math.floor(Math.random() * 10),
            subId: "",
            tgId: "",
            totalGB: Math.floor(Math.random() * 10) * 1024 * 1024 * 1024,
        });

        assert(client2);
        expect(client2.email).toBe(email2);
    });

    it("Get Client By Email", async () => {
        local.flushCache();
        const client = await local.getClient(email);
        assert(client);
        expect(client.email).toBe(email);
    });

    it("Get Client By Id", async () => {
        local.flushCache();
        const client = await local.getClient(id);
        assert(client);
        expect(client.email).toBe(email);
    });

    it("Get Client Options By Email", async () => {
        local.flushCache();
        const client = await local.getClientOptions(email);
        assert(client);
        expect(client.email).toBe(email);
    });

    it("Get Client Options By Id", async () => {
        local.flushCache();
        const client = await local.getClientOptions(id);
        assert(client);
        expect(client.email).toBe(email);
    });

    it("Update Client By Email", async () => {
        const client = await local.updateClient(email, {
            enable: false,
        });

        assert(client);
        expect(client.email).toBe(email);

        const options = await local.getClientOptions(email);
        assert(options);
        expect(options.enable).toBe(false);
    });

    it("Update Client By Id", async () => {
        const client = await local.updateClient(id, {
            enable: true,
        });

        assert(client);
        expect(client.email).toBe(email);

        const options = await local.getClientOptions(id);
        assert(options);
        expect(options.enable).toBe(true);
    });

    it("Get Client Ips By Email", async () => {
        const ips = await local.getClientIps(email);
        assert(ips);
        expect(ips).toBeDefined();
    });

    it("Reset Client Ips By ID", async () => {
        const result = await local.resetClientIps(id);
        expect(result).toBe(true);
    });

    it("Reset Client Stat By Email", async () => {
        const result = await local.resetClientStat(email);
        expect(result).toBe(true);
    });

    it("Reset Client Stat By ID", async () => {
        const result = await local.resetClientStat(id);
        expect(result).toBe(true);
    });

    it("Delete Deprecated Clients", async () => {
        const result = await local.deleteDepletedClients();
        expect(result).toBe(true);
    });

    it("Delete Deprecated Clients of Inbound", async () => {
        const result = await local.deleteInboundDepletedClients(inboundId);
        expect(result).toBe(true);
    });

    it("Delete Client By Email", async () => {
        const result = await local.deleteClient(email);
        expect(result).toBe(true);
    });

    it("Delete Client By Id", async () => {
        const result = await local.deleteClient(id2);
        expect(result).toBe(true);
    });
});
