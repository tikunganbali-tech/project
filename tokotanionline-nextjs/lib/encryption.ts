/**
 * PHASE 6A — ENCRYPTION UTILITY
 * 
 * Encrypt/decrypt sensitive data (API keys, passwords) for at-rest storage
 * Uses AES-256-GCM with key derived from NEXTAUTH_SECRET
 * 
 * Security:
 * - Encryption key derived from NEXTAUTH_SECRET (never stored)
 * - AES-256-GCM authenticated encryption
 * - Each encryption uses unique IV
 * - Encrypted data includes auth tag for tamper detection
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from NEXTAUTH_SECRET
 * Uses PBKDF2 with 100,000 iterations
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a plaintext string
 * Returns: base64(IV + SALT + AUTH_TAG + CIPHERTEXT)
 * 
 * @param plaintext - String to encrypt
 * @returns Encrypted string (base64)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') {
    throw new Error('Cannot encrypt empty string');
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters for encryption');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from secret + salt
  const key = deriveKey(secret, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine: IV + SALT + AUTH_TAG + CIPHERTEXT
  const combined = Buffer.concat([iv, salt, authTag, encrypted]);

  // Return base64
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted string
 * 
 * @param encrypted - Base64 encrypted string
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string): string {
  if (!encrypted || encrypted.trim() === '') {
    throw new Error('Cannot decrypt empty string');
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters for decryption');
  }

  try {
    // Decode base64
    const combined = Buffer.from(encrypted, 'base64');

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const salt = combined.subarray(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const authTag = combined.subarray(IV_LENGTH + SALT_LENGTH, IV_LENGTH + SALT_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + SALT_LENGTH + AUTH_TAG_LENGTH);

    // Derive key
    const key = deriveKey(secret, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Mask a secret value for display
 * Shows first 4 and last 4 characters, masks the rest
 * 
 * @param value - Secret value to mask
 * @param showChars - Number of characters to show at start/end (default: 4)
 * @returns Masked string (e.g., "sk-...xyz")
 */
export function maskSecret(value: string | null | undefined, showChars: number = 4): string {
  if (!value || value.length === 0) {
    return '••••••••';
  }

  if (value.length <= showChars * 2) {
    return '••••••••';
  }

  const start = value.substring(0, showChars);
  const end = value.substring(value.length - showChars);
  return `${start}${'•'.repeat(Math.max(8, value.length - showChars * 2))}${end}`;
}
