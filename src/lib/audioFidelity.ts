/**
 * audioFidelity.ts
 * Utilitários para garantia de fidelidade estrita entre o texto pedagógico e a narração de áudio.
 * Implementa normalização de texto e SHA-256 puro em TypeScript (isomórfico, síncrono, zero dependências).
 */

export function normalizeAudioText(rawText: string | undefined | null): string {
  if (!rawText) return "";
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Implementação pura de SHA-256 síncrona (RFC 6234).
 * Funciona de forma idêntica em Node.js, Vercel Serverless, Edge e no Browser.
 */
function sha256Sync(str: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";

  const K: number[] = [];
  const initialHash: number[] = [];

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2, primeCount = 0; primeCount < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * candidate; i < 312; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCount < 8) {
        initialHash[primeCount] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      K[primeCount] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCount++;
    }
  }

  // UTF-8 encode
  const words: number[] = [];
  let asciiBitLength = str[lengthProperty] * 8;
  for (let i = 0; i < str[lengthProperty]; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      words[i >> 2] |= code << (24 - (i % 4) * 8);
    } else if (code < 0x800) {
      words[i >> 2] |= (0xc0 | (code >> 6)) << (24 - (i % 4) * 8);
      i++;
      words[i >> 2] |= (0x80 | (code & 0x3f)) << (24 - (i % 4) * 8);
      asciiBitLength += 8;
    } else {
      words[i >> 2] |= (0xe0 | (code >> 12)) << (24 - (i % 4) * 8);
      i++;
      words[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << (24 - (i % 4) * 8);
      i++;
      words[i >> 2] |= (0x80 | (code & 0x3f)) << (24 - (i % 4) * 8);
      asciiBitLength += 16;
    }
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w = new Array(64);
  const hash = initialHash.slice(0);

  for (let i = 0; i < words[lengthProperty]; i += 16) {
    const subHash = hash.slice(0);

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (((w[j - 16] + gamma0) | 0) + ((w[j - 7] + gamma1) | 0)) | 0;
      }

      const ch = (subHash[4] & subHash[5]) ^ (~subHash[4] & subHash[6]);
      const maj = (subHash[0] & subHash[1]) ^ (subHash[0] & subHash[2]) ^ (subHash[1] & subHash[2]);
      const sigma0 = rightRotate(subHash[0], 2) ^ rightRotate(subHash[0], 13) ^ rightRotate(subHash[0], 22);
      const sigma1 = rightRotate(subHash[4], 6) ^ rightRotate(subHash[4], 11) ^ rightRotate(subHash[4], 25);

      const temp1 =
        (((subHash[7] + sigma1) | 0) + (((ch + K[j]) | 0) + w[j]) | 0) | 0;
      const temp2 = (sigma0 + maj) | 0;

      subHash[7] = subHash[6];
      subHash[6] = subHash[5];
      subHash[5] = subHash[4];
      subHash[4] = (subHash[3] + temp1) | 0;
      subHash[3] = subHash[2];
      subHash[2] = subHash[1];
      subHash[1] = subHash[0];
      subHash[0] = (temp1 + temp2) | 0;
    }

    for (let j = 0; j < 8; j++) {
      hash[j] = (hash[j] + subHash[j]) | 0;
    }
  }

  let result = "";
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += (byte < 16 ? "0" : "") + byte.toString(16);
    }
  }
  return result;
}

export function computeTextHash(text: string | undefined | null): string {
  const normalized = normalizeAudioText(text);
  if (!normalized) return "";
  return sha256Sync(normalized);
}

export type StatusFidelidadeAudio = "sincronizado" | "desatualizado" | "pendente" | "manual";

export function checkAudioFidelity(
  text: string | undefined | null,
  currentHash: string | undefined | null,
  hasAudioUrl: boolean = false,
  isIaAudio: boolean = false
): {
  status: StatusFidelidadeAudio;
  isSynchronized: boolean;
  computedHash: string;
} {
  const computedHash = computeTextHash(text);

  if (!hasAudioUrl) {
    return {
      status: "pendente",
      isSynchronized: false,
      computedHash,
    };
  }

  if (!isIaAudio && !currentHash) {
    return {
      status: "manual",
      isSynchronized: true,
      computedHash,
    };
  }

  if (!currentHash) {
    return {
      status: "pendente",
      isSynchronized: false,
      computedHash,
    };
  }

  const isSynchronized = computedHash === currentHash;
  return {
    status: isSynchronized ? "sincronizado" : "desatualizado",
    isSynchronized,
    computedHash,
  };
}
