import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';
import type { CryptoService, EncryptionResult, DecryptionRequest } from '../types/crypto.js';
import { CryptoError } from '../types/crypto.js';

export class ChaCha20Poly1305Service implements CryptoService {
	private static instance: ChaCha20Poly1305Service;

	private constructor() {}

	public static getInstance(): ChaCha20Poly1305Service {
		if (!ChaCha20Poly1305Service.instance) {
			ChaCha20Poly1305Service.instance = new ChaCha20Poly1305Service();
		}
		return ChaCha20Poly1305Service.instance;
	}

	public async generateKey(): Promise<string> {
		try {
			// ChaCha20 uses 256-bit (32 byte) keys
			const key = randomBytes(32);
			return btoa(String.fromCharCode(...key));
		} catch (error) {
			throw new CryptoError(
				`Failed to generate key: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'KEY_GENERATION_FAILED'
			);
		}
	}

	public generateNonce(): Uint8Array {
		try {
			// ChaCha20Poly1305 uses 12-byte nonces
			return randomBytes(12);
		} catch (error) {
			throw new CryptoError('Failed to generate nonce', 'NONCE_GENERATION_FAILED');
		}
	}

	public async encrypt(data: string): Promise<EncryptionResult> {
		try {
			// Generate key and nonce
			const key = await this.generateKey();
			const nonce = this.generateNonce();
			
			// Convert key from base64 to Uint8Array
			const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
			
			// Convert data to bytes
			const dataBytes = new TextEncoder().encode(data);
			
			// Create cipher and encrypt
			const cipher = chacha20poly1305(keyBytes, nonce);
			const encryptedBytes = cipher.encrypt(dataBytes);
			
			// Convert to base64
			const encryptedData = btoa(String.fromCharCode(...encryptedBytes));
			const nonceBase64 = btoa(String.fromCharCode(...nonce));

			return {
				encryptedData,
				nonce: nonceBase64,
				key
			};
		} catch (error) {
			throw new CryptoError(
				`Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'ENCRYPTION_FAILED'
			);
		}
	}

	public async decrypt(request: DecryptionRequest): Promise<string> {
		try {
			// Convert from base64 to bytes
			const keyBytes = Uint8Array.from(atob(request.key), (c) => c.charCodeAt(0));
			const nonce = Uint8Array.from(atob(request.nonce), (c) => c.charCodeAt(0));
			const encryptedBytes = Uint8Array.from(atob(request.encryptedData), (c) => c.charCodeAt(0));

			// Create cipher and decrypt
			const cipher = chacha20poly1305(keyBytes, nonce);
			const decryptedBytes = cipher.decrypt(encryptedBytes);
			
			// Convert back to string
			return new TextDecoder().decode(decryptedBytes);
		} catch (error) {
			throw new CryptoError(
				`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'DECRYPTION_FAILED'
			);
		}
	}
}

export const cryptoService = ChaCha20Poly1305Service.getInstance();