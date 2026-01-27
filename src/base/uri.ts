import { parseUrl } from "3x-ui/utils/parseUrl.js";

export class URI {
    readonly uri: string;
    readonly host: string;
    readonly port: number;
    readonly protocol: string;
    readonly path: string;
    readonly username: string;
    readonly password: string;
    readonly endpoint: string;

    constructor(uri: string) {
        const schema = parseUrl(uri);
        this.uri = uri;
        this.protocol = schema.protocol;
        this.host = schema.host;
        this.port = schema.port;
        this.path = schema.path;
        this.username = schema.username;
        this.password = schema.password;
        this.endpoint = schema.endpoint;
    }
}
