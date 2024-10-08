import { assert, expect, describe, it } from "vitest";
import { addInbound } from "./utils/addInbound";
import { api } from "./utils/api";

describe("Inbound", () => {
    it("Add Inbound", async () => {
        const inbound = await addInbound("Inbound");
        expect(inbound).toBeTypeOf("object");
    });

    it("Fetch Inbounds", async () => {
        api.flushCache();
        const inbounds = await api.getInbounds();
        expect(inbounds).toBeDefined();
        expect(inbounds.length).toBeGreaterThan(0);
    });

    it("Fetch Inbound", async () => {
        const inbound = await addInbound("Inbound");
        assert(inbound);
        api.flushCache();
        const result = await api.getInbound(inbound.id);
        expect(result).toBeDefined();
    });

    it("Update Inbound", async () => {
        const inbound = await addInbound("Inbound");
        assert(inbound);
        api.flushCache();
        const result = await api.updateInbound(inbound.id, {
            remark: `${inbound.remark} - Updated`,
        });

        expect(result).toBeTypeOf("object");
    });

    it("Reset Inbounds Stat", async () => {
        const result = await api.resetInboundsStat();
        expect(result).toBe(true);
    });

    it("Reset Inbound Stat", async () => {
        const inbound = await addInbound("Inbound");
        assert(inbound);
        api.flushCache();
        const result = await api.resetInboundStat(inbound.id);
        expect(result).toBe(true);
    });

    it("Delete Inbound", async () => {
        const inbounds = await api.getInbounds();
        assert(inbounds.length > 0);

        for (const inbound of inbounds) {
            if (!inbound.remark.startsWith("Inbound - ")) continue;
            const result = await api.deleteInbound(inbound.id);
            expect(result).toBe(true);
        }
    });
});
