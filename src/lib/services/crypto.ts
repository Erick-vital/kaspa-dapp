import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';
import type { CryptoService, EncryptionResult, DecryptionRequest } from '../types/crypto.js';
import { CryptoError } from '../types/crypto.js';
import { keyDerivationService, type SharedKeyInfo } from './keyDerivation.js';

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

	/**
	 * Encripta un artículo privado usando derivación de clave desde la wallet
	 */
	public async encryptPrivateArticle(data: string, articleId: string): Promise<EncryptionResult> {
		try {
			// Derivar clave específica del artículo desde la wallet
			const keyResult = await keyDerivationService.derivePrivateArticleKey(articleId);
			const nonce = this.generateNonce();
			
			// Convert key from base64 to Uint8Array
			const keyBytes = Uint8Array.from(atob(keyResult.key), (c) => c.charCodeAt(0));
			
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
				key: keyResult.key
			};
		} catch (error) {
			throw new CryptoError(
				`Failed to encrypt private article: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'PRIVATE_ENCRYPTION_FAILED'
			);
		}
	}

	/**
	 * Encripta un artículo público usando shared key para URL sharing
	 */
	public encryptPublicArticle(data: string, articleId: string): Promise<EncryptionResult & { sharedKeyInfo: SharedKeyInfo }> {
		return new Promise((resolve, reject) => {
			try {
				// Generar shared key para compartir
				const sharedKeyInfo = keyDerivationService.generateSharedKey(articleId);
				const nonce = this.generateNonce();
				
				// Convert key from base64 to Uint8Array
				const keyBytes = Uint8Array.from(atob(sharedKeyInfo.key), (c) => c.charCodeAt(0));
				
				// Convert data to bytes
				const dataBytes = new TextEncoder().encode(data);
				
				// Create cipher and encrypt
				const cipher = chacha20poly1305(keyBytes, nonce);
				const encryptedBytes = cipher.encrypt(dataBytes);
				
				// Convert to base64
				const encryptedData = btoa(String.fromCharCode(...encryptedBytes));
				const nonceBase64 = btoa(String.fromCharCode(...nonce));

				resolve({
					encryptedData,
					nonce: nonceBase64,
					key: sharedKeyInfo.key,
					sharedKeyInfo
				});
			} catch (error) {
				reject(new CryptoError(
					`Failed to encrypt public article: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'PUBLIC_ENCRYPTION_FAILED'
				));
			}
		});
	}

	/**
	 * Desencripta un artículo privado re-derivando la clave desde la wallet
	 */
	public async decryptPrivateArticle(encryptedData: string, nonce: string, articleId: string): Promise<string> {
		try {
			// Re-derivar clave desde la wallet
			const keyResult = await keyDerivationService.derivePrivateArticleKey(articleId);
			
			return await this.decrypt({
				encryptedData,
				nonce,
				key: keyResult.key
			});
		} catch (error) {
			throw new CryptoError(
				`Failed to decrypt private article: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'PRIVATE_DECRYPTION_FAILED'
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