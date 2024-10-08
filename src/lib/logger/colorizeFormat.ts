import winston from "winston";

export const colorizeFormat = winston.format.colorize({
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
