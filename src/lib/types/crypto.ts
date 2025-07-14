export interface EncryptionResult {
	encryptedData: string; // base64
	nonce: string; // base64
	key: string; // base64
}

export interface DecryptionRequest {
	encryptedData: string;
	nonce: string;
	key: string;
}

export interface CryptoService {
	encrypt(data: string): Promise<EncryptionResult>;
	decrypt(request: DecryptionRequest): Promise<string>;
	generateKey(): Promise<string>;
	generateNonce(): Uint8Array;
	encryptPrivateArticle(data: string, articleId: string): Promise<EncryptionResult>;
	encryptPublicArticle(data: string, articleId: string): Promise<EncryptionResult & { sharedKeyInfo: any }>;
	decryptPrivateArticle(encryptedData: string, nonce: string, articleId: string): Promise<string>;
}

export class CryptoError extends Error {
	constructor(message: string, public readonly code: string) {
		super(message);
		this.name = 'CryptoError';
	}
}