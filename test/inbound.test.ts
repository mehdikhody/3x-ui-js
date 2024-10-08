import { assert, expect, describe, it } from "vitest";
import { Api, ClientOptions } from "3x-ui";

describe("Inbound", () => {
    const local = new Api("http://admin:admin@localhost:2053");

    it("Add Inbound", async () => {
        const inbound = await local.addInbound({
            enable: true,
            remark: "New inbound",
            listen: "127.0.0.1",
            port: 48965,
            protocol: "vmess",
            expiryTime: 0,
            settings: {
                password: "password",
                decryption: "none",
                fallbacks: [],
                clients: [
                    {
                        id: "6641ba90-4734-4eba-bf7d-a9e1ad0c85f7",
                        email: "new@example.com",
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

        assert(inbound);
        expect(inbound.remark).toBe("New inbound");
    });

    it("Fetch Inbounds", async () => {
        const inbounds = await local.getInbounds();
        expect(inbounds).toBeDefined();
        expect(inbounds.length).toBeGreaterThan(0);
    });

    it("Fetch Inbound", async () => {
        const inbounds = await local.getInbounds();
        assert(inbounds.length > 0);
        local.flushCache();
        const inbound = await local.getInbound(inbounds[0].id);
        assert(inbound);
        expect(inbound).toBeDefined();
        expect(inbound.id).toBe(1);
    });

    it("Update Inbound", async () => {
        const inbounds = await local.getInbounds();
        const inbound = inbounds.find((inbound) => inbound.remark === "New inbound");
        assert(inbound);

        const updatedInbound = await local.updateInbound(inbound.id, {
            remark: "Updated inbound",
        });

        assert(updatedInbound);
        expect(updatedInbound.remark).toBe("Updated inbound");
    });

    it("Delete Inbound", async () => {
        const inbounds = await local.getInbounds();
        const inbound = inbounds.find((inbound) => inbound.remark === "Updated inbound");
        assert(inbound);
        const result = await local.deleteInbound(inbound.id);
        expect(result).toBe(true);
        const newInbounds = await local.getInbounds();
        expect(newInbounds.length).toBe(inbounds.length - 1);
    });

    it("Reset Inbounds Stat", async () => {
        const result = await local.resetInboundsStat();
        expect(result).toBe(true);
    });

    it("Reset Inbound Stat", async () => {
        const inbounds = await local.getInbounds();
        assert(inbounds.length > 0);
        const result = await local.resetInboundStat(inbounds[0].id);
        expect(result).toBe(true);
    });
});
