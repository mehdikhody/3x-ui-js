import winston from "winston";
import { consoleTransport } from "./consoleTransport.js";

export const createLogger = (name: string) => {
    return winston.createLogger({
        level: "silly",
        format: winston.format.label({ label: name }),
        transports: [consoleTransport],
    });
};
