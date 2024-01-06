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

## Functions

### getInbounds()

This function will return all inbounds in an array.

```javascript
const inbounds = await panel.getInbounds();
```

### getInbound(id: number)

This function will return an inbound with the given id.

```javascript
const inbound = await panel.getInbound(1);
```

### addInbound(options: InboundOptions)

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
