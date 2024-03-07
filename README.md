# 3x-ui Node.js SDK

The 3x-ui is a JavaScript library designed to facilitate communication with the [3x-ui panel](https://github.com/MHSanaei/3x-ui), which runs Xray Core for proxy services. This SDK empowers JavaScript developers to create bots and websites for both commercial and non-commercial uses, providing simplicity, abstraction around the API, caching for improved performance, and mutex for asynchronous safety.

This package is developed based on [MHSanaei Postman Collection](https://documenter.getpostman.com/view/16802678/2s9YkgD5jm#9cac8101-017e-4415-94e2-d30f4dcf49de) and you can check it out for more information.

### Features

-   ✅ **Simplicity**: Designed with simplicity in mind to streamline the process of interacting with the 3x-ui panel.
-   ✅ **Abstraction**: Provides an abstraction layer around the 3x-ui API to simplify finding clients by email, uuid (vmess, vless) or password (trojan).
-   ✅ **Proxy:** Utilizes an underlying proxy agent for communication with the panel if needed.
-   ✅ **Caching:** Caches responses for improved performance.
-   ✅ **Mutex:** Provides a mutex, a lock mechanism, to ensure asynchronous safety and prevent race conditions.
-   ✅ **Debug Mode:** Enables debug mode for detailed logging.
-   ✅ **TTL:** Allows you to set the cache time in seconds.

## Installation

To install the 3x-ui SDK, use npm:

```bash
npm install 3x-ui
```

## Usage

First, import the SDK:

```js
import { Panel } from "3x-ui";
```

Initialize the SDK with the URL of your 3x-ui panel:

```js
const api = new Panel("http://username:password@localhost:2053");
api.debug = true; // Enables debug mode - defualt is false
api.stdTTL = 60; // Cache time in seconds - default is 10s
```

Then, you can utilize the SDK functions:

```js
const inbounds = await api.getInbounds();
const clientStat = await api.getClient("email or uuid or password");
const clientOptions = await api.getClientOptions("email or uuid or password");
const onlines = await api.getOnlineClients();
```

## Proxy

The SDK uses an underlying proxy agent to connect to the panel. You can specify the proxy settings using environment variables such as HTTP_PROXY and HTTPS_PROXY. Refer to the proxy-agent [documentation](https://www.npmjs.com/package/proxy-agent) for more information.

```env
HTTP_PROXY="http://proxy-server-over-tcp.com:3128"
HTTPS_PROXY="https://proxy-server-over-tls.com:3129"
```

## API

### Inbounds

-   `getInbounds()`: Returns an array of all inbounds.
-   `getInbound(id: number)`: Returns the inbound with the specified ID.
-   `addInbound(options: InboundOptions)`: Adds a new inbound with the provided options.
-   `updateInbound(id: number, options: Partial<InboundOptions>)`: Updates the inbound with the specified ID using the provided options.
-   `resetInboundsStat()`: Resets statistics for all inbounds.
-   `resetInboundStat(id: number)`: Resets statistics for the inbound with the specified ID.
-   `deleteInbound(id: number)`: Deletes the inbound with the specified ID.

### Clients

-   `getClient(email: string)`: Returns a client with the given email.
-   `getClientIps(email: string)`: Returns all client's IPs with the given email.
-   `getClientOptions(email: string)`: Returns all client's options with the given email.
-   `addClient(inboundId: number, options: ClientOptions)`: Adds a new client with the given options.
-   `addClients(inboundId: number, clients: ClientOptions[])`: Adds new clients with the given options.
-   `updateClient(inboundId: number, clientId: string, options: Partial<ClientOptions>)`: Updates a client with the given client ID.
-   `resetClientIps(email: string)`: Resets all client's IPs with the given email.
-   `resetClientStat(inboundId: number, email: string)`: Resets a client's stat with the given email.
-   `deleteClient(inboundId: number, email: string)`: Deletes a client with the given email.
-   `deleteDepletedClients()`: Deletes all clients that have depleted their traffic.
-   `deleteInboundDepletedClients(inboundId: number)`: Deletes all clients of an inbound that have depleted their traffic.

### Other Functions

-   `getOnlineClients()`: Returns all online clients.
-   `exportData()`: Exports all data via Telegram bot.

## Example

For more examples, check out [the example directory on our GitHub repository](https://github.com/mehdikhody/3x-ui-js/tree/master/examples).
