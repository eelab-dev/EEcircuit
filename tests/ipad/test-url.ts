import { hostname, networkInterfaces } from "node:os";

const stripTrailingSlash = (value: string): string => value.replace(/\/$/u, "");

const macReachableHost = (): string => {
  const interfaces = networkInterfaces();
  const usableAddress = (name: string): string | undefined => interfaces[name]?.find(
    (address) => address.family === "IPv4" && !address.internal,
  )?.address;
  const preferred = ["en0", "en1", "en2"].map(usableAddress).find(Boolean);
  if (preferred) return preferred;

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (/^(?:utun|awdl|llw|bridge)/u.test(name)) continue;
    const address = addresses?.find((item) => item.family === "IPv4" && !item.internal)?.address;
    if (address) return address;
  }

  const host = hostname();
  return host.includes(".") ? host : `${host}.local`;
};

export const ipadBaseUrl = (): string => {
  const configured = process.env.SAFARI_IPAD_BASE_URL?.trim();
  if (configured) {
    const parsed = new URL(configured);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("SAFARI_IPAD_BASE_URL must use http or https");
    }
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error("SAFARI_IPAD_BASE_URL must be an origin without a path, query, or fragment");
    }
    return stripTrailingSlash(parsed.toString());
  }
  return `http://${macReachableHost()}:4177`;
};
