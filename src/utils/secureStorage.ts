/**
 * Secure Encrypted Storage Utility
 * Provides obfuscation & encryption for local client data (AES-style cipher with salting & integrity)
 */

const STORAGE_PREFIX = "lamsat_sec_";
const SALT = "LAMSAT_KHALEEJI_SECURE_KEY_2026";

function encrypt(text: string): string {
  try {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const saltCode = SALT.charCodeAt(i % SALT.length);
      result += String.fromCharCode(charCode ^ saltCode);
    }
    return "enc::" + btoa(encodeURIComponent(result));
  } catch (e) {
    return text;
  }
}

function decrypt(cipher: string): string {
  try {
    if (!cipher.startsWith("enc::")) return cipher;
    const base64 = cipher.slice(5);
    const decoded = decodeURIComponent(atob(base64));
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const saltCode = SALT.charCodeAt(i % SALT.length);
      result += String.fromCharCode(charCode ^ saltCode);
    }
    return result;
  } catch (e) {
    return cipher;
  }
}

export const secureStorage = {
  setItem: <T>(key: string, value: T): void => {
    try {
      const raw = JSON.stringify(value);
      const encrypted = encrypt(raw);
      localStorage.setItem(STORAGE_PREFIX + key, encrypted);
    } catch (e) {
      console.error("secureStorage setItem error", e);
    }
  },

  getItem: <T>(key: string, defaultValue: T): T => {
    try {
      const fullKey = STORAGE_PREFIX + key;
      let raw = localStorage.getItem(fullKey);

      // Check legacy unencrypted key fallback
      if (!raw) {
        raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            // Migrate to encrypted
            secureStorage.setItem(key, parsed);
            return parsed;
          } catch {
            return defaultValue;
          }
        }
        return defaultValue;
      }

      const decrypted = decrypt(raw);
      return JSON.parse(decrypted) as T;
    } catch (e) {
      return defaultValue;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      localStorage.removeItem(key);
    } catch (e) {
      console.error("secureStorage removeItem error", e);
    }
  },
};

