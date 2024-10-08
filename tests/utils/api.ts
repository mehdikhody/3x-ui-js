import { XuiApi } from "3x-ui";
import urlJoin from "url-join";
import { removeColorsAndUnwantedChars } from "./removeColorsAndUnwantedChars";

const webBasePath = "O3dyelGTRl";
const baseUrl = "http://admin:admin@localhost:2053";
export const url = urlJoin(baseUrl, removeColorsAndUnwantedChars(webBasePath));
export const api = new XuiApi(url);
api.debug = true;
