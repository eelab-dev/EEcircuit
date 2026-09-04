/** Creates RFC 4122 version 4 IDs even when randomUUID is hidden on an HTTP LAN origin. */
export function createUuid(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") return webCrypto.randomUUID();
  if (typeof webCrypto?.getRandomValues !== "function") {
    throw new Error("This browser does not provide a cryptographically secure random-number generator.");
  }

  const bytes = webCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hexadecimal = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hexadecimal.slice(0, 4).join("")}-${hexadecimal.slice(4, 6).join("")}-` +
    `${hexadecimal.slice(6, 8).join("")}-${hexadecimal.slice(8, 10).join("")}-` +
    hexadecimal.slice(10).join("");
}
