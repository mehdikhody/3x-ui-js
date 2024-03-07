import { Panel } from "3x-ui";

const local = new Panel("http://username:password@localhost:2053");

const inboundId = 1;
await local.addClient(inboundId, {
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
