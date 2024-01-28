import winston from "winston";

export const createLogger = (label: string) => {
    return winston.createLogger({
        level: "silly",
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.label({ label }),
                    winston.format.colorize({ level: true, message: true }),
                    winston.format.printf(({ level, message }) => {
                        return `[${label}][${level}] ${message}`;
                    }),
                ),
            }),
        ],
    });
};
