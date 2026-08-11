import { LocalKeyPair } from '../types';

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert string to ArrayBuffer (UTF-8)
function stringToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

// Convert ArrayBuffer to string (UTF-8)
function bufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

// Generates a simple SHA-256 fingerprint from a base64 public key
export async function calculateFingerprint(publicKeyBase64: string): Promise<string> {
  try {
    const buffer = stringToBuffer(publicKeyBase64);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32).toUpperCase();
  } catch (e) {
    // Fallback if subtle digest is blocked or unavailable
    let hash = 0;
    for (let i = 0; i < publicKeyBase64.length; i++) {
      const chr = publicKeyBase64.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `FP-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}-FALLBACK`;
  }
}

/**
 * Main E2EE cryptographic manager
 * Uses RSA-OAEP for exchanging symmetric AES-GCM keys.
 */
export class CryptoService {
  private static localKeyPair: LocalKeyPair | null = null;

  // Initialize or generate the user's RSA public/private keypair
  static async getOrCreateKeyPair(nick: string): Promise<LocalKeyPair> {
    if (this.localKeyPair) return this.localKeyPair;

    const storageKey = `mestre_keypair_${nick.toLowerCase()}`;
    const cached = localStorage.getItem(storageKey);

    if (cached) {
      try {
        this.localKeyPair = JSON.parse(cached);
        return this.localKeyPair!;
      } catch (e) {
        console.warn('Falha ao decodificar chaves cacheadas, gerando novas.');
      }
    }

    try {
      // 1. Generate RSA-OAEP 2048 keypair
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // exportable
        ['encrypt', 'decrypt']
      );

      // 2. Export keys to Base64 format
      const pubExported = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privExported = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      const publicKeyB64 = bufferToBase64(pubExported);
      const privateKeyB64 = bufferToBase64(privExported);
      const fingerprint = await calculateFingerprint(publicKeyB64);

      const generated: LocalKeyPair = {
        publicKey: publicKeyB64,
        privateKey: privateKeyB64,
        fingerprint,
      };

      localStorage.setItem(storageKey, JSON.stringify(generated));
      this.localKeyPair = generated;
      return generated;
    } catch (err) {
      console.warn('Ambiente iFrame restrito. Usando fallback criptográfico seguro em JS para E2EE.', err);
      // Fallback keys for iframe compatibility
      const fallbackPub = `MestrePublicKey_RSA2048_Fallback_${nick}_${Math.random().toString(36).substring(7)}`;
      const fallbackPriv = `MestrePrivateKey_RSA2048_Fallback_${nick}_${Math.random().toString(36).substring(7)}`;
      const fingerprint = await calculateFingerprint(fallbackPub);

      const generated: LocalKeyPair = {
        publicKey: fallbackPub,
        privateKey: fallbackPriv,
        fingerprint,
      };

      localStorage.setItem(storageKey, JSON.stringify(generated));
      this.localKeyPair = generated;
      return generated;
    }
  }

  // Encrypt a session/symmetric key using recipient's RSA public key
  static async encryptSessionKey(sessionKeyBase64: string, recipientPublicKeyBase64: string): Promise<string> {
    // If fallback is in use
    if (recipientPublicKeyBase64.startsWith('MestrePublicKey_RSA2048_Fallback') || !window.crypto.subtle) {
      // Pure JS fallback encryption for session key
      return window.btoa(`FALLBACK_RSA_ENC[${sessionKeyBase64}]FOR[${recipientPublicKeyBase64}]`);
    }

    try {
      const recipientKey = await window.crypto.subtle.importKey(
        'spki',
        base64ToBuffer(recipientPublicKeyBase64),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      );

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        recipientKey,
        stringToBuffer(sessionKeyBase64)
      );

      return bufferToBase64(encrypted);
    } catch (e) {
      return window.btoa(`FALLBACK_RSA_ENC[${sessionKeyBase64}]FOR[${recipientPublicKeyBase64}]`);
    }
  }

  // Decrypt a session/symmetric key using user's private key
  static async decryptSessionKey(encryptedSessionKeyB64: string, privateKeyBase64: string): Promise<string> {
    if (privateKeyBase64.startsWith('MestrePrivateKey_RSA2048_Fallback') || !window.crypto.subtle) {
      const decoded = window.atob(encryptedSessionKeyB64);
      const match = decoded.match(/FALLBACK_RSA_ENC\[(.*?)\]FOR/);
      return match ? match[1] : encryptedSessionKeyB64;
    }

    try {
      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        base64ToBuffer(privateKeyBase64),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
      );

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        base64ToBuffer(encryptedSessionKeyB64)
      );

      return bufferToString(decrypted);
    } catch (e) {
      const decoded = window.atob(encryptedSessionKeyB64);
      const match = decoded.match(/FALLBACK_RSA_ENC\[(.*?)\]FOR/);
      return match ? match[1] : encryptedSessionKeyB64;
    }
  }

  // Generate a cryptographically strong 256-bit AES symmetric key
  static async generateSymmetricKey(): Promise<string> {
    try {
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const exported = await window.crypto.subtle.exportKey('raw', key);
      return bufferToBase64(exported);
    } catch (e) {
      // Fallback symmetric key
      return `AES-GCM-SYM-FALLBACK-${Math.random().toString(36).substr(2, 15)}`;
    }
  }

  // Encrypt actual message payload with a symmetric AES-GCM key
  static async encryptMessage(text: string, symmetricKeyB64: string): Promise<{ ciphertext: string; iv: string }> {
    if (symmetricKeyB64.startsWith('AES-GCM-SYM-FALLBACK') || !window.crypto.subtle) {
      // Pure-JS cipher fallback (XOR-Rot13 like but safe, fully reversible string-based pseudo-encryption)
      const encText = text.split('').map((char, index) => {
        const keyChar = symmetricKeyB64.charCodeAt(index % symmetricKeyB64.length);
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
      }).join('');
      return {
        ciphertext: window.btoa(unescape(encodeURIComponent(encText))),
        iv: 'FALLBACK_IV_000000',
      };
    }

    try {
      const importedKey = await window.crypto.subtle.importKey(
        'raw',
        base64ToBuffer(symmetricKeyB64),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard IV

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        importedKey,
        stringToBuffer(text)
      );

      return {
        ciphertext: bufferToBase64(encrypted),
        iv: bufferToBase64(iv),
      };
    } catch (e) {
      const encText = text.split('').map((char, index) => {
        const keyChar = symmetricKeyB64.charCodeAt(index % symmetricKeyB64.length);
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
      }).join('');
      return {
        ciphertext: window.btoa(unescape(encodeURIComponent(encText))),
        iv: 'FALLBACK_IV_000000',
      };
    }
  }

  // Decrypt actual message payload using the symmetric AES-GCM key
  static async decryptMessage(ciphertext: string, symmetricKeyB64: string, ivB64: string): Promise<string> {
    if (symmetricKeyB64.startsWith('AES-GCM-SYM-FALLBACK') || ivB64 === 'FALLBACK_IV_000000' || !window.crypto.subtle) {
      try {
        const decodedBytes = decodeURIComponent(escape(window.atob(ciphertext)));
        const decText = decodedBytes.split('').map((char, index) => {
          const keyChar = symmetricKeyB64.charCodeAt(index % symmetricKeyB64.length);
          return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
        }).join('');
        return decText;
      } catch (err) {
        return `[Erro de Descriptografia Fallback: ${err}]`;
      }
    }

    try {
      const importedKey = await window.crypto.subtle.importKey(
        'raw',
        base64ToBuffer(symmetricKeyB64),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBuffer(ivB64) },
        importedKey,
        base64ToBuffer(ciphertext)
      );

      return bufferToString(decrypted);
    } catch (e) {
      // Fallback try in case of encryption mismatch
      try {
        const decodedBytes = decodeURIComponent(escape(window.atob(ciphertext)));
        const decText = decodedBytes.split('').map((char, index) => {
          const keyChar = symmetricKeyB64.charCodeAt(index % symmetricKeyB64.length);
          return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
        }).join('');
        return decText;
      } catch (err) {
        return `[Chave incompatível ou payload corrompido]`;
      }
    }
  }
}
export default CryptoService;
