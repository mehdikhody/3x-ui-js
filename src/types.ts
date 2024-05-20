export type ServerOptions = {
    host: string;
    port: number;
    protocol?: "http" | "https";
    path?: string;
};

export type Client = {
    id: number;
    inboundId: number;
    enable: boolean;
    email: string;
    up: number;
    down: number;
    expiryTime: number;
    total: number;
    reset: number;
};

export type ClientOptionsForVmess = {
    id: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: number;
    subId?: string;
    reset?: number;
};

export type ClientOptionsForVless = {
    id: string;
    flow?: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: number;
    subId?: string;
    reset?: number;
};

export type ClientOptionsForTrojan = {
    password: string;
    flow?: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: number;
    subId?: string;
    reset?: number;
};

export type ClientOptionsForShadowsocks = {
    method?: string;
    password: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: number;
    subId?: string;
    reset?: number;
};

export type ClientOptions =
    | ClientOptionsForVmess
    | ClientOptionsForVless
    | ClientOptionsForTrojan
    | ClientOptionsForShadowsocks;

export type Inbound = {
    id: number;
    up: number;
    down: number;
    total: number;
    remark: string;
    enable: boolean;
    expiryTime: number;
    clientStats: Client[];
    listen: string;
    port: number;
    protocol: string;
    settings: string;
    streamSettings: string;
    tag: string;
    sniffing: string;
};

export type InboundOptions = {
    enable: boolean;
    remark: string;
    listen: string;
    port: number;
    protocol:
        | "vmess"
        | "vless"
        | "trojan"
        | "shadowsocks"
        | "dokodemo-door"
        | "socks"
        | "https"
        | string;
    expiryTime: number;
    settings: string;
    streamSettings: string;
    sniffing: string;
};
