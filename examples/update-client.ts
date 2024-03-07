import { Panel } from "3x-ui";

const local = new Panel("http://username:password@localhost:2053");

const inboundId = 1;
const clientUUID = "95e4e7bb-7796-47e7-e8a7-f4055194f776";

await local.updateClient(inboundId, clientUUID, {
    email: "updatedEmail",
});
