export const stringifySettings = (settings: any) => {
    if (typeof settings === "object") {
        return JSON.stringify(settings);
    }

    if (typeof settings === "string") {
        return settings;
    }

    return "";
};
