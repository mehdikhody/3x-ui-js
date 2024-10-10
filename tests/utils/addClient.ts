import type { ClientOptions } from "3x-ui";
import { randomUUID, randomInt } from "crypto";
import { faker } from "@faker-js/faker";
import { api } from "./api";

export const addClient = async (inboundId: number) => {
    const email = faker.internet.email().toLowerCase();
    const id = randomUUID();
    const expiryTime = Date.now() + randomInt(-864000, 31104000);
    const enable = randomInt(0, 10) > 3;
    const limitIp = randomInt(0, 10);
    const totalGB = randomInt(1, 100) * 1073741824;

    const options: ClientOptions = {
        email: email,
        enable: enable,
        expiryTime: expiryTime,
        id: id,
        limitIp: limitIp,
        totalGB: totalGB,
    };

    const clinet = await api.addClient(inboundId, options);

    return {
        client: clinet,
        options: options,
    };
};
