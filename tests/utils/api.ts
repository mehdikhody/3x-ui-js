import { XuiApi } from "3x-ui";
import { removeColors } from "./removeColors";
import server from "../server.json";

const user = removeColors(server.username);
const pass = removeColors(server.password);
const port = removeColors(server.port);
const webBasePath = removeColors(server.webBasePath);

const uri = `http://${user}:${pass}@localhost:${port}/${webBasePath}`;
export const api = new XuiApi(uri);
api.debug = true;
