import { describe, it, expect } from "vitest";
import { parseUrl } from "./parseUrl.js";

describe("parseUrl", () => {
    it("parses a basic https URL without credentials or explicit port", () => {
        const result = parseUrl("https://example.com/path/to/resource");

        expect(result).toEqual({
            protocol: "https",
            host: "example.com",
            port: 443,
            path: "/path/to/resource",
            username: "",
            password: "",
            endpoint: "https://example.com/path/to/resource",
        });
    });

    it("parses an http URL and applies default port 80", () => {
        const result = parseUrl("http://example.com/api");

        expect(result).toEqual({
            protocol: "http",
            host: "example.com",
            port: 80,
            path: "/api",
            username: "",
            password: "",
            endpoint: "http://example.com/api",
        });
    });

    it("parses URL with explicit port", () => {
        const result = parseUrl("https://example.com:8443/api");

        expect(result.port).toBe(8443);
        expect(result.endpoint).toBe("https://example.com:8443/api");
    });

    it("parses URL with username and password", () => {
        const result = parseUrl("https://user:pass@example.com/secure");

        expect(result).toEqual({
            protocol: "https",
            host: "example.com",
            port: 443,
            path: "/secure",
            username: "user",
            password: "pass",
            endpoint: "https://example.com/secure",
        });
    });

    it("decodes percent-encoded username and password", () => {
        const result = parseUrl("https://wT289*)5*L:21!>d`YIvZ2z`@@example.com/secure");

        expect(result.username).toBe("wT289*)5*L");
        expect(result.password).toBe("21!>d`YIvZ2z`@");
    });

    it("handles URL without path (defaults to /)", () => {
        const result = parseUrl("https://example.com");

        expect(result.path).toBe("/");
        expect(result.endpoint).toBe("https://example.com/");
    });

    it("preserves encoded path characters", () => {
        const result = parseUrl("https://example.com/a%20b");

        expect(result.path).toBe("/a%20b");
        expect(result.endpoint).toBe("https://example.com/a%20b");
    });
});
