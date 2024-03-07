import { Panel } from "3x-ui";

const local = new Panel("http://username:password@localhost:2053");
const inbound = await local.addInbound({
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
