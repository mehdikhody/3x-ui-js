import type { ClientOptions } from "3x-ui";
import { randomBytes, randomUUID, randomInt } from "crypto";
import { faker } from "@faker-js/faker";
import { api } from "./api";

let port = randomInt(10000, 90000);

export const addInbound = async (prefix: string) => {
    port++;
    const remark = `${prefix} - ${randomBytes(5).toString("hex")}`;
    const email = faker.internet.email().toLowerCase();

    return api.addInbound({
        enable: true,
        remark: remark,
        listen: "127.0.0.1",
        port: port,
        protocol: "vmess",
        expiryTime: 0,
        settings: {
            password: "password",
            decryption: "none",
            fallbacks: [],
            clients: [
                {
                    id: randomUUID(),
                    email: email,
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
};
