import winston from "winston";
import chalk from "chalk";

export const createLogger = (name: string) => {
    const colorizeFormat = winston.format.colorize({
        message: true,
        level: true,
        colors: {
            info: "blue",
            error: "red",
            warn: "yellow",
            debug: "cyan",
            verbose: "white",
            http: "magenta",
            silly: "gray",
        },
    });

    const consoleTransport = new winston.transports.Console({
        format: winston.format.combine(
            colorizeFormat,
            winston.format.printf(({ level, label, message }) => {
                label = chalk.bold.white(label);
                return `[${label}][${level}]: ${message}`;
            }),
        ),
    });

    return winston.createLogger({
        level: "silly",
        format: winston.format.label({ label: name }),
        transports: [consoleTransport],
    });
};
