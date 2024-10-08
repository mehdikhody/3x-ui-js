import { assert, expect, describe, beforeAll, afterAll, it } from "vitest";
import { api } from "./utils/api";
import { addInbound } from "./utils/addInbound";
import { addClient } from "./utils/addClient";

let inboundId = 0;

beforeAll(async () => {
    const inbound = await addInbound("Client");
    assert(inbound);
    inboundId = inbound.id;
});

afterAll(async () => {
    const inbounds = await api.getInbounds();
    for (const inbound of inbounds) {
        if (!inbound.remark.startsWith("Client - ")) continue;
        await api.deleteInbound(inbound.id);
    }
});

describe("Client", () => {
    it("Add Client", async () => {
        const { client, options } = await addClient(inboundId);
        assert(client);
        expect(options.email).toBe(client.email);
    });

    it("Get Client By Email", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();
        const client = await api.getClient(options.email);
        assert(client);
        expect(client.email).toBe(options.email);
    });

    it("Get Client By Id", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();
        const client = await api.getClient(options.id);
        assert(client);
        expect(client.email).toBe(options.email);
    });

    it("Get Client Options By Email", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();
        const client = await api.getClientOptions(options.email);
        assert(client);
        expect(client.email).toBe(options.email);
    });

    it("Get Client Options By Id", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();
        const client = await api.getClientOptions(options.id);
        assert(client);
        expect(client.email).toBe(options.email);
    });

    it("Update Client By Email", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        await api.updateClient(options.email, {
            tgId: 1234,
        });

        const updatedOptions = await api.getClientOptions(options.email);
        assert(updatedOptions);
        expect(updatedOptions.tgId).toBe(1234);
    });

    it("Update Client By Id", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        await api.updateClient(options.id, {
            tgId: 1234,
        });

        const updatedOptions = await api.getClientOptions(options.id);
        assert(updatedOptions);
        expect(updatedOptions.tgId).toBe(1234);
    });

    it("Get Online Clients", async () => {
        const clients = await api.getOnlineClients();
        assert(clients);
        expect(clients).toBeDefined();
    });

    it("Get Client Ips By Email", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        const ips = await api.getClientIps(options.email);
        assert(ips);
        expect(ips).toBeDefined();
    });

    it("Get Client Ips By Id", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        const ips = await api.getClientIps(options.id);
        assert(ips);
        expect(ips).toBeDefined();
    });

    it("Reset Client Ips By Email", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        const result = await api.resetClientIps(options.email);
        expect(result).toBe(true);
    });

    it("Reset Client Ips By Id", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        const result = await api.resetClientIps(options.id);
        expect(result).toBe(true);
    });

    it("Delete Deprecated Clients", async () => {
        const result = await api.deleteDepletedClients();
        expect(result).toBe(true);
    });

    it("Delete Deprecated Clients of Inbound", async () => {
        const result = await api.deleteInboundDepletedClients(inboundId);
        expect(result).toBe(true);
    });

    it("Delete Client By Email", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        const result = await api.deleteClient(options.email);
        expect(result).toBe(true);
    });

    it("Delete Client By Id", async () => {
        const { options } = await addClient(inboundId);
        api.flushCache();

        const result = await api.deleteClient(options.id);
        expect(result).toBe(true);
    });
});
