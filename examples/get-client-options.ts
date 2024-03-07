import { Panel } from "3x-ui";

const local = new Panel("http://username:password@localhost:2053");

const clientByEmail = local.getClientOptions("email");

// for vmess, vless protocols
const clientByUUID = local.getClientOptions("95e4e7bb-7796-47e7-e8a7-f4055194f776");

// for trojan protocol
const clientByPassword = local.getClientOptions("password");

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
