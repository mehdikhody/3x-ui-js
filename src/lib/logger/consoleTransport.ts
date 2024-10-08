import chalk from "chalk";
import winston from "winston";
import { colorizeFormat } from "./colorizeFormat.js";

export const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        colorizeFormat,
        winston.format.printf(({ level, label, message }) => {
            label = chalk.bold.white(label);
            return `[${label}][${level}]: ${message}`;
        }),
    ),
});
