import { randomBytes } from '@noble/hashes/utils';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import type { Article } from '../types/article';

export class URLShortenerService {
	private static instance: URLShortenerService;
	private serverUrl: string;
	
	public static getInstance(): URLShortenerService {
		if (!URLShortenerService.instance) {
			URLShortenerService.instance = new URLShortenerService();
		}
		return URLShortenerService.instance;
	}

	constructor() {
		this.serverUrl = typeof window !== 'undefined' 
			? 'http://localhost:3001' 
			: 'http://localhost:3001';
	}

	private encryptForStorage(data: string, key: Uint8Array): Uint8Array {
		const nonce = randomBytes(12);
		const cipher = chacha20poly1305(key, nonce);
		const encrypted = cipher.encrypt(new TextEncoder().encode(data));
		
		// Combinar nonce + encrypted
		const result = new Uint8Array(nonce.length + encrypted.length);
		result.set(nonce, 0);
		result.set(encrypted, nonce.length);
		return result;
	}

	private decryptFromStorage(encryptedData: Uint8Array, key: Uint8Array): string {
		const nonce = encryptedData.slice(0, 12);
		const encrypted = encryptedData.slice(12);
		
		const cipher = chacha20poly1305(key, nonce);
		const decrypted = cipher.decrypt(encrypted);
		return new TextDecoder().decode(decrypted);
	}

	public async createShortURL(article: Article): Promise<{ shortUrl: string; fullUrl: string }> {
		if (!article.isPublic) {
			throw new Error('Cannot create short URL for private articles');
		}

		try {
			// Crear datos compactos para cifrado (formato compacto)
			const compactData = {
				i: article.id,
				t: article.title,
				c: article.content,
				a: article.author,
				d: article.createdAt,
				p: 1,
				...(article.image && { img: article.image }),
				x: article.txId
			};

			// Crear datos completos para URL completa (formato completo)
			const fullData = {
				id: article.id,
				title: article.title,
				content: article.content,
				author: article.author,
				createdAt: article.createdAt,
				isPublic: true,
				...(article.image && { image: article.image }),
				txId: article.txId
			};

			// Generar clave para cifrado secundario
			const secondaryKey = randomBytes(32);
			
			// Cifrar datos compactos para almacenamiento
			const dataString = JSON.stringify(compactData);
			const encryptedPayload = this.encryptForStorage(dataString, secondaryKey);
			
			// Enviar al servidor SQLite
			const response = await fetch(`${this.serverUrl}/api/short`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					articleId: article.id,
					title: article.title,
					author: article.author,
					createdAt: article.createdAt,
					contentHash: this.hashString(article.content),
					encryptedPayload: Array.from(encryptedPayload),
					encryptionKey: Array.from(secondaryKey)
				})
			});

			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}

			const { shortId, encryptionKey } = await response.json();
			
			// Usar la clave retornada por el servidor (puede ser existente o nueva)
			const finalKey = encryptionKey ? new Uint8Array(encryptionKey) : secondaryKey;

			// Crear URLs
			const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
			const keyBase64 = btoa(String.fromCharCode.apply(null, Array.from(finalKey)))
				.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
			const shortUrl = `${baseUrl}/articles/${shortId}?k=${keyBase64}`;
			
			// URL completa (resistente a censura)
			const fullDataBase64 = btoa(JSON.stringify(fullData));
			const fullUrl = `${baseUrl}/articles/${article.id}?shared=${fullDataBase64}`;

			console.log('🔗 URLs generated successfully');

			return { shortUrl, fullUrl };
		} catch (error) {
			console.error('Error creating short URL:', error);
			throw new Error('Failed to create short URL');
		}
	}

	public async resolveShortURL(shortId: string, key: string): Promise<Article | null> {
		try {
			console.log('🔗 Resolving short URL:', { shortId, hasKey: !!key });
			
			// Consultar al servidor SQLite
			const response = await fetch(`${this.serverUrl}/api/short/${shortId}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					console.warn('Short URL not found or expired:', shortId);
				} else {
					console.error('Server error resolving short URL:', response.status);
				}
				return null;
			}

			const stored = await response.json();

			// Decodificar clave (manejar caracteres URL-safe)
			let normalizedKey = key.replace(/-/g, '+').replace(/_/g, '/');
			while (normalizedKey.length % 4) {
				normalizedKey += '=';
			}
			const keyBytes = new Uint8Array(atob(normalizedKey).split('').map(c => c.charCodeAt(0)));
			
			// Descifrar payload
			const encryptedPayload = new Uint8Array(stored.encryptedPayload);
			const decryptedData = this.decryptFromStorage(encryptedPayload, keyBytes);
			const articleData = JSON.parse(decryptedData);

			// Convertir formato compacto a formato completo
			const article: Article = {
				id: articleData.i,
				title: articleData.t,
				content: articleData.c,
				author: articleData.a,
				createdAt: articleData.d,
				isPublic: !!articleData.p,
				image: articleData.img,
				txId: articleData.x
			};

			console.log('✅ Resolved short URL successfully');
			return article;
		} catch (error) {
			console.error('Error resolving short URL:', error);
			return null;
		}
	}

	private hashString(str: string): string {
		// Hash simple para verificación
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convertir a 32bit integer
		}
		return hash.toString(16);
	}

	public async getStorageStats(): Promise<{ totalUrls: number; activeUrls: number } | null> {
		try {
			const response = await fetch(`${this.serverUrl}/api/stats`);
			if (!response.ok) {
				console.error('Error fetching stats:', response.status);
				return null;
			}
			return await response.json();
		} catch (error) {
			console.error('Error fetching storage stats:', error);
			return null;
		}
	}
}

export const urlShortener = URLShortenerService.getInstance();