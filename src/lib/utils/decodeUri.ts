import urljoin from "url-join";

export const decodeUri = (uri: string) => {
    const url = new URL(encodeURI(uri));
    const protocol = url.protocol.slice(0, -1);
    const host = url.hostname;
    const defaultPort = protocol === "https" ? 443 : 80;
    const port = url.port.length ? Number(url.port) : defaultPort;
    const path = url.pathname;
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const endpoint = urljoin(url.origin, path);

    return {
        protocol,
        host,
        port,
        path,
        username,
        password,
        endpoint,
    };
};
