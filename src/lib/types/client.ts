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

export type ClientVmessOptions = {
    id: string;
    email: string;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    enable: boolean;
    tgId?: number | string;
    subId?: string;
    reset?: number;
};

export type ClientVlessOptions = {
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

export type ClientTrojanOptions = {
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

export type ClientShadowsocksOptions = {
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
    | ClientVmessOptions
    | ClientVlessOptions
    | ClientTrojanOptions
    | ClientShadowsocksOptions;
