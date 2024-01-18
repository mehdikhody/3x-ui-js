# 3x-ui

This is an interface for 3x-ui panel. It will help developers to create, edit and delete inbounds and clients in a simple way.
This package is developed based on [MHSanaei Postman Collection](https://documenter.getpostman.com/view/16802678/2s9YkgD5jm#9cac8101-017e-4415-94e2-d30f4dcf49de) and you can check it out for more information.

## Installation

You can install this package using npm:

```bash
npm install 3x-ui
```

## Usage

First of all, you need to import the package:

```javascript
import { XUI } from "3x-ui";
```

Then you can use the functions:

```javascript
const panel = new XUI("localhost", 2053, "username", "password");

const inbounds = await panel.getInbounds();
const clients = await panel.getClients();
const clientStat = await panel.getClient("email");
const clientOptions = await panel.getClientOptions("email");
const onlines = await panel.getOnlineClients();
```

## Proxy

We are using undrelying proxy agent to connect to the panel. Which proxy is used for each HTTP request is determined by the `HTTP_PROXY` and `HTTPS_PROXY` environment variables.

See `proxy-agent` [documentation](https://www.npmjs.com/package/proxy-agent) for more information.

```env
HTTP_PROXY="http://proxy-server-over-tcp.com:3128"
HTTPS_PROXY="https://proxy-server-over-tls.com:3129"
```

## API

### `getInbounds()`

This function will return all inbounds in an array.

```javascript
const inbounds = await panel.getInbounds();
```

### `getInbound(id: number)`

This function will return an inbound with the given id.

```javascript
const inbound = await panel.getInbound(1);

// {
//     id: 1,
//     up: 0,
//     down: 0,
//     total: 0,
//     remark: "New inbound",
//     enable: true,
//     expiryTime: 0,
//     clientStats: null,
//     listen: "",
//     port: 48965,
//     protocol: "vmess",
//     settings:
//         '{"clients": [ { "alterId": 0, "email": "xn1aaiwm", "enable": true, "expiryTime": 0, "id": "1db9f8ba-d1ad-4b0e-cea2-6edf9947dae5", "limitIp": 0, "subId": "", "tgId": "", "totalGB": 0 }],"decryption": "none","fallbacks": []\n}',
//     streamSettings:
//         '{"network":"ws","security":"none","wsSettings":{"acceptProxyProtocol":false,"path":"/","headers":{}}}',
//     tag: "inbound-48965",
//     sniffing: '{"enabled":true,"destOverride":["http","tls"]}',
// }
```

### `addInbound(options: InboundOptions)`

This function will add a new inbound with the given options.

```javascript
const inbound = await panel.addInbound({
    enable: true,
    remark: "New inbound",
    listen: "",
    port: 48965,
    protocol: "vmess",
    expiryTime: 0,
    settings: JSON.stringify({
        clients: [],
        decryption: "none",
        fallbacks: [],
    }),
    streamSettings: JSON.stringify({
        network: "ws",
        security: "none",
        wsSettings: {
            acceptProxyProtocol: false,
            path: "/",
            headers: {},
        },
    }),
    sniffing: JSON.stringify({
        enabled: true,
        destOverride: ["http", "tls"],
    }),
});
```

### `updateInbound(id: number, options: Partial<InboundOptions>)`

This function will update an inbound with the given id and options.

```javascript
const updatedInbound = await panel.updateInbound(1, {
    remark: "Updated inbound",
});
```

### `resetInboundsStat()`

This function will reset all inbounds' stats.

```javascript
await panel.resetInboundsStat();
```

### `resetInboundStat(id: number)`

This function will reset an inbound's stats with the given id.

```javascript
await panel.resetInboundStat(1);
```

### `deleteInbound(id: number)`

This function will delete an inbound with the given id.

```javascript
await panel.deleteInbound(1);
```

### `getClients()`

This function will return all clients in an array.

```javascript
const clients = await panel.getClients();
```

### `getClient(email: string)`

This function will return a client with the given email.

```javascript
const client = await panel.getClient("email");

// {
//     id: 3,
//     inboundId: 1,
//     enable: true,
//     email: "email",
//     up: 0,
//     down: 0,
//     expiryTime: 1682864675944,
//     total: 42949672960,
// }
```

### `getClientByClientId(id: string)`

This function will return a client with the given id.
In `vmess` and `vless` id `id` is the client `uuid` and in `trojan` id is the client `password` and in `shadowsocks` id is the client `email`.

```javascript
const client = await panel.getClientByClientId(
    "95e4e7bb-7796-47e7-e8a7-f4055194f776",
);

// {
//     id: 3,
//     inboundId: 1,
//     enable: true,
//     email: "email",
//     up: 0,
//     down: 0,
//     expiryTime: 1682864675944,
//     total: 42949672960,
// }
```

### `getClientIps(email: string)`

This function will return all client's ips with the given email.

```javascript
const clientIps = await panel.getClientIps("email");

// ["127.0.0.1"]
```

### `getClientOptions(email: string)`

This function will return all client's options with the given email.

```javascript
const clientOptions = await panel.getClientOptions("email");

// {
//     id: "95e4e7bb-7796-47e7-e8a7-f4055194f776",
//     alterId: 0,
//     email: "email",
//     limitIp: 2,
//     totalGB: 42949672960,
//     expiryTime: 1682864675944,
//     enable: true,
//     tgId: "",
//     subId: "",
// }
```

### `getClientOptionsByClientId(id: string)`

This function will return all client's options with the given id.
In `vmess` and `vless` id `id` is the client `uuid` and in `trojan` id is the client `password` and in `shadowsocks` id is the client `email`.

```javascript
const clientOptions = await panel.getClientOptionsByClientId(
    "95e4e7bb-7796-47e7-e8a7-f4055194f776",
);

// {
//     id: "95e4e7bb-7796-47e7-e8a7-f4055194f776",
//     alterId: 0,
//     email: "email",
//     limitIp: 2,
//     totalGB: 42949672960,
//     expiryTime: 1682864675944,
//     enable: true,
//     tgId: "",
//     subId: "",
// }
```

### `addClient(inboundId: number, options: ClientOptions)`

This function will add a new client with the given options.

```javascript
const client = await panel.addClient(1, {
    alterId: 0,
    email: "email",
    enable: true,
    expiryTime: 1682864675944,
    id: "95e4e7bb-7796-47e7-e8a7-f4055194f776",
    limitIp: 2,
    subId: "",
    tgId: "",
    totalGB: 42949672960,
});
```

### addClients(inboundId: number, clients: ClientOptions[])

This function will add new clients with the given options.

### `updateClient(inboundId: number, clientId: string, options: Partial<ClientOptions>)`

This function will update a client with the given client id.

```javascript
const updatedClient = await panel.updateClient(
    1,
    "95e4e7bb-7796-47e7-e8a7-f4055194f776",
    {
        email: "updatedEmail",
    },
);

// {
//     id: 3,
//     inboundId: 1,
//     enable: true,
//     email: "updatedEmail",
//     up: 0,
//     down: 0,
//     expiryTime: 1682864675944,
//     total: 42949672960,
// }
```

### `resetClientIps(email: string)`

This function will reset all client's ips with the given email.

```javascript
await panel.resetClientIps("email");
```

### `resetClientStat(inboundId: number, email: string)`

This function will reset a client's stat with the given email.

```javascript
await panel.resetClientStat(1, "email");
```

### `deleteClient(inboundId: number, email: string)`

This function will delete a client with the given email.

```javascript
await panel.deleteClient(1, "email");
```

### `deleteDepletedClients()`

This function will delete all clients that have depleted their traffic.

```javascript
await panel.deleteDepletedClients();
```

### `deleteInboundDepletedClients(inboundId: number)`

This function will delete all clients of an inbound that have depleted their traffic.

```javascript
await panel.deleteInboundDepletedClients(1);
```

### `getOnlineClients()`

This function will return all online clients.

```javascript
const onlineClients = await panel.getOnlineClients();

// ['email', 'email2']
```

### `exportData()`

This function will export all data via Telegram bot.

```javascript
await panel.exportDatabase();
```
