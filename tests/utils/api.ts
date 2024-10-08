import { XuiApi } from "3x-ui";

const webBasePath = "O3dyelGTRl";
export const api = new XuiApi(`http://admin:admin@localhost:2053/${webBasePath}`);
api.debug = true;
