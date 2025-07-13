import type {
	Article,
	EncryptedArticle,
	ArticleMetadata,
	ArticlePayload,
	CreateArticleRequest,
	PublishResult,
	ArticleKey
} from '../types/article.js';
import { kaswareService } from './kasware.js';
import { cryptoService } from './crypto.js';
import { walletStore } from '../stores/wallet.js';
import { get } from 'svelte/store';

export class ArticleService {
	private static instance: ArticleService;
	private readonly MAX_CONTENT_SIZE = 10 * 1024; // 10KB límite para contenido

	private constructor() {}

	public static getInstance(): ArticleService {
		if (!ArticleService.instance) {
			ArticleService.instance = new ArticleService();
		}
		return ArticleService.instance;
	}

	private generateArticleId(): string {
		return `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private validateArticleContent(content: string): void {
		const contentBytes = new TextEncoder().encode(content).length;
		if (contentBytes > this.MAX_CONTENT_SIZE) {
			throw new Error(
				`Article content too large: ${contentBytes} bytes (max: ${this.MAX_CONTENT_SIZE} bytes)`
			);
		}
	}

	private async createEncryptedArticle(
		request: CreateArticleRequest,
		author: string
	): Promise<{ encryptedArticle: EncryptedArticle; key: ArticleKey }> {
		this.validateArticleContent(request.content);

		const articleId = this.generateArticleId();
		const timestamp = Date.now();
		const contentBytes = new TextEncoder().encode(request.content).length;

		// Cifrar el contenido
		const encryptionResult = await cryptoService.encrypt(request.content);

		// Crear metadatos
		const metadata: ArticleMetadata = {
			title: request.title,
			summary: request.summary,
			tags: request.tags,
			image: request.image,
			isPublic: request.isPublic,
			price: request.price,
			author,
			createdAt: timestamp,
			updatedAt: timestamp,
			contentSize: contentBytes
		};

		// Crear artículo cifrado
		const encryptedArticle: EncryptedArticle = {
			id: articleId,
			encryptedContent: encryptionResult.encryptedData,
			nonce: encryptionResult.nonce,
			metadata,
			txId: '' // Se asignará después de la transacción
		};

		// Crear clave
		const key: ArticleKey = {
			key: encryptionResult.key,
			articleId,
			isPublic: request.isPublic
		};

		return { encryptedArticle, key };
	}

	private createPayload(encryptedArticle: EncryptedArticle, key?: ArticleKey): ArticlePayload {
		const payload: ArticlePayload = {
			type: 'article',
			version: '1.0',
			data: encryptedArticle
		};

		// Si es público, incluir la clave en el payload
		if (key && key.isPublic) {
			(payload as any).key = key.key;
		}

		return payload;
	}

	private validatePayloadSize(payload: ArticlePayload): void {
		const payloadString = JSON.stringify(payload);
		const payloadBytes = new TextEncoder().encode(payloadString).length;
		const maxPayloadSize = 50 * 1024; // Límite generoso de 50KB para todo el payload

		if (payloadBytes > maxPayloadSize) {
			throw new Error(
				`Payload too large: ${payloadBytes} bytes (max: ${maxPayloadSize} bytes)`
			);
		}
	}

	public async publishArticle(request: CreateArticleRequest): Promise<PublishResult> {
		try {
			// Verificar conexión a kasware
			if (!kaswareService.isInstalled()) {
				throw new Error('KasWare wallet not installed');
			}

			const accounts = await kaswareService.getAccounts();
			if (accounts.length === 0) {
				throw new Error('No wallet account connected');
			}

			const author = accounts[0];

			// Crear artículo cifrado
			const { encryptedArticle, key } = await this.createEncryptedArticle(request, author);

			// Crear payload
			const payload = this.createPayload(encryptedArticle, key);

			// Validar tamaño del payload
			this.validatePayloadSize(payload);

			// Serializar payload
			const payloadString = JSON.stringify(payload);

			// Estrategia alternativa: usar signMessage para "publicar" el artículo
			// Esto crea una firma que podemos usar como referencia
			const messageToSign = `KASPA_ARTICLE:${encryptedArticle.id}:${payloadString}`;
			
			try {
				const signature = await kaswareService.signMessage(messageToSign);
				
				// Usar la firma como "txId" simulado para propósitos de demostración
				// En una implementación real, necesitarías un backend que maneje las transacciones
				const simulatedTxId = `sig_${Date.now()}_${signature.slice(0, 16)}`;
				
				// Actualizar artículo con txId simulado
				encryptedArticle.txId = simulatedTxId;

				// Almacenar clave localmente si es público
				if (key.isPublic) {
					this.storeArticleKey(key);
				}

				// Almacenar artículo localmente junto con la firma
				this.storeArticle(encryptedArticle);
				this.storeArticleSignature(encryptedArticle.id, signature, payloadString);

				return {
					success: true,
					articleId: encryptedArticle.id,
					txId: simulatedTxId
				};
			} catch (signError) {
				// Si signMessage falla, intentar envío directo a propia dirección
				console.warn('SignMessage failed, trying direct transaction:', signError);
				
				// Enviar una pequeña cantidad a nuestra propia dirección (esto crea una transacción real)
				const minAmount = 100000; // 0.001 KAS en sompi
				const txId = await kaswareService.sendKaspa(author, minAmount);
				
				// Actualizar artículo con txId real
				encryptedArticle.txId = txId;

				// Almacenar el payload asociado con la transacción
				this.storeArticleWithTransaction(encryptedArticle.id, txId, payloadString);

				// Almacenar clave localmente si es público
				if (key.isPublic) {
					this.storeArticleKey(key);
				}

				// Almacenar artículo localmente
				this.storeArticle(encryptedArticle);

				return {
					success: true,
					articleId: encryptedArticle.id,
					txId
				};
			}
		} catch (error) {
			console.error('Error publishing article:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	private storeArticle(article: EncryptedArticle): void {
		try {
			const stored = localStorage.getItem('articles') || '[]';
			const articles: EncryptedArticle[] = JSON.parse(stored);
			articles.push(article);
			localStorage.setItem('articles', JSON.stringify(articles));
		} catch (error) {
			console.warn('Failed to store article locally:', error);
		}
	}

	private storeArticleKey(key: ArticleKey): void {
		try {
			const stored = localStorage.getItem('articleKeys') || '[]';
			const keys: ArticleKey[] = JSON.parse(stored);
			keys.push(key);
			localStorage.setItem('articleKeys', JSON.stringify(keys));
		} catch (error) {
			console.warn('Failed to store article key locally:', error);
		}
	}

	private storeArticleSignature(articleId: string, signature: string, payload: string): void {
		try {
			const stored = localStorage.getItem('articleSignatures') || '{}';
			const signatures: Record<string, { signature: string; payload: string; timestamp: number }> = JSON.parse(stored);
			signatures[articleId] = {
				signature,
				payload,
				timestamp: Date.now()
			};
			localStorage.setItem('articleSignatures', JSON.stringify(signatures));
		} catch (error) {
			console.warn('Failed to store article signature locally:', error);
		}
	}

	private storeArticleWithTransaction(articleId: string, txId: string, payload: string): void {
		try {
			const stored = localStorage.getItem('articleTransactions') || '{}';
			const transactions: Record<string, { txId: string; payload: string; timestamp: number }> = JSON.parse(stored);
			transactions[articleId] = {
				txId,
				payload,
				timestamp: Date.now()
			};
			localStorage.setItem('articleTransactions', JSON.stringify(transactions));
		} catch (error) {
			console.warn('Failed to store article transaction locally:', error);
		}
	}

	public getStoredArticles(): EncryptedArticle[] {
		try {
			const stored = localStorage.getItem('articles') || '[]';
			return JSON.parse(stored);
		} catch {
			return [];
		}
	}

	public getStoredKeys(): ArticleKey[] {
		try {
			const stored = localStorage.getItem('articleKeys') || '[]';
			return JSON.parse(stored);
		} catch {
			return [];
		}
	}

	public async decryptArticle(encryptedArticle: EncryptedArticle, key: string): Promise<Article> {
		try {
			const decryptedContent = await cryptoService.decrypt({
				encryptedData: encryptedArticle.encryptedContent,
				nonce: encryptedArticle.nonce,
				key
			});

			const article: Article = {
				id: encryptedArticle.id,
				title: encryptedArticle.metadata.title,
				content: decryptedContent,
				summary: encryptedArticle.metadata.summary,
				tags: encryptedArticle.metadata.tags,
				image: encryptedArticle.metadata.image,
				isPublic: encryptedArticle.metadata.isPublic,
				price: encryptedArticle.metadata.price,
				author: encryptedArticle.metadata.author,
				createdAt: encryptedArticle.metadata.createdAt,
				updatedAt: encryptedArticle.metadata.updatedAt,
				txId: encryptedArticle.txId
			};

			return article;
		} catch (error) {
			throw new Error(`Failed to decrypt article: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public async getDecryptedArticles(): Promise<Article[]> {
		// Check if wallet is connected for private articles access
		const walletState = get(walletStore);
		const isWalletConnected = walletState.isConnected && !walletState.isManuallyDisconnected;

		const encryptedArticles = this.getStoredArticles();
		const keys = this.getStoredKeys();
		const decryptedArticles: Article[] = [];

		console.log('📰 Getting decrypted articles:', {
			encryptedCount: encryptedArticles.length,
			keysCount: keys.length
		});

		for (const encryptedArticle of encryptedArticles) {
			try {
				// Buscar la clave correspondiente
				let articleKey = keys.find(key => key.articleId === encryptedArticle.id);
				
				if (articleKey) {
					console.log(`🔑 Found key for article ${encryptedArticle.id}`);
					const decryptedArticle = await this.decryptArticle(encryptedArticle, articleKey.key);
					decryptedArticles.push(decryptedArticle);
				} else {
					// Si no hay clave pero es público, intentar extraer de payload
					if (encryptedArticle.metadata.isPublic) {
						console.log(`🔓 Trying to extract key for public article ${encryptedArticle.id}`);
						const key = this.extractKeyFromPublicPayload(encryptedArticle.id);
						if (key) {
							console.log(`✅ Extracted key for public article ${encryptedArticle.id}`);
							const decryptedArticle = await this.decryptArticle(encryptedArticle, key);
							decryptedArticles.push(decryptedArticle);
							
							// Almacenar la clave extraída para futuras consultas
							const extractedKey = {
								key,
								articleId: encryptedArticle.id,
								isPublic: true
							};
							this.storeArticleKey(extractedKey);
						} else {
							console.warn(`❌ Could not extract key for public article ${encryptedArticle.id}`);
						}
					} else {
						// Skip private articles if wallet not connected
						if (!isWalletConnected) {
							console.log(`🔒 Skipping private article ${encryptedArticle.id} - wallet not connected`);
						} else {
							console.warn(`🔒 No key found for private article ${encryptedArticle.id}`);
						}
					}
				}
			} catch (error) {
				console.warn(`💥 Failed to decrypt article ${encryptedArticle.id}:`, error);
			}
		}

		console.log(`📊 Successfully decrypted ${decryptedArticles.length} of ${encryptedArticles.length} articles`);

		// Ordenar por fecha de creación (más recientes primero)
		return decryptedArticles.sort((a, b) => b.createdAt - a.createdAt);
	}

	private extractKeyFromPublicPayload(articleId: string): string | null {
		try {
			console.log(`🔍 Extracting key for article: ${articleId}`);

			// Intentar extraer clave de signatures almacenadas
			const signatures = localStorage.getItem('articleSignatures') || '{}';
			const signaturesData = JSON.parse(signatures);
			
			console.log(`📝 Checking signatures for ${articleId}:`, signaturesData[articleId] ? 'Found' : 'Not found');
			
			if (signaturesData[articleId]) {
				try {
					const payload = JSON.parse(signaturesData[articleId].payload);
					console.log(`🔑 Signature payload for ${articleId}:`, { hasKey: !!payload.key });
					if (payload.key) {
						return payload.key;
					}
				} catch (error) {
					console.warn(`❌ Error parsing signature payload for ${articleId}:`, error);
				}
			}

			// Intentar extraer clave de transactions almacenadas  
			const transactions = localStorage.getItem('articleTransactions') || '{}';
			const transactionsData = JSON.parse(transactions);
			
			console.log(`💳 Checking transactions for ${articleId}:`, transactionsData[articleId] ? 'Found' : 'Not found');
			
			if (transactionsData[articleId]) {
				try {
					const payload = JSON.parse(transactionsData[articleId].payload);
					console.log(`🔑 Transaction payload for ${articleId}:`, { hasKey: !!payload.key });
					if (payload.key) {
						return payload.key;
					}
				} catch (error) {
					console.warn(`❌ Error parsing transaction payload for ${articleId}:`, error);
				}
			}

			console.warn(`🚫 No key found in any payload for article ${articleId}`);
			return null;
		} catch (error) {
			console.error(`💥 Error extracting key for ${articleId}:`, error);
			return null;
		}
	}

	public async getArticleById(id: string, sharedData?: string, compressedData?: string): Promise<Article | null> {
		console.log('🔍 getArticleById called with:', { id, hasSharedData: !!sharedData, hasCompressedData: !!compressedData });
		
		// Intentar datos comprimidos primero
		if (compressedData) {
			try {
				console.log('📦 Attempting to decompress data...');
				const decompressed = this.decompressString(compressedData);
				const compactData = JSON.parse(decompressed);
				
				// Convertir formato compacto a formato completo
				const articleData = {
					id: compactData.i,
					title: compactData.t,
					content: compactData.c,
					author: compactData.a,
					createdAt: compactData.d,
					isPublic: !!compactData.p,
					image: compactData.img,
					txId: compactData.x
				};
				
				console.log('📦 Decompressed article data:', { 
					id: articleData.id, 
					isPublic: articleData.isPublic, 
					title: articleData.title?.substring(0, 50) + '...' 
				});
				
				// Validar que es el artículo correcto y público
				if (articleData.id === id && articleData.isPublic) {
					console.log('✅ Loading compressed shared article from URL');
					// Almacenar para futuras visitas
					this.storeArticleForSharing(articleData);
					return articleData;
				}
			} catch (error) {
				console.warn('❌ Failed to decompress article data:', error);
			}
		}
		
		// Si hay datos compartidos regulares, intentar decodificar
		if (sharedData) {
			try {
				console.log('📎 Attempting to decode shared data...');
				const decodedData = atob(sharedData);
				const articleData = JSON.parse(decodedData);
				
				console.log('📎 Decoded article data:', { 
					id: articleData.id, 
					isPublic: articleData.isPublic, 
					title: articleData.title?.substring(0, 50) + '...' 
				});
				
				// Validar que es el artículo correcto y público
				if (articleData.id === id && articleData.isPublic) {
					console.log('✅ Loading shared public article from URL');
					// Almacenar para futuras visitas
					this.storeArticleForSharing(articleData);
					return articleData;
				} else {
					console.warn('❌ Article ID mismatch or not public:', { 
						expectedId: id, 
						actualId: articleData.id, 
						isPublic: articleData.isPublic 
					});
				}
			} catch (error) {
				console.warn('❌ Failed to decode shared article data:', error);
			}
		}

		console.log('🔍 Trying local storage...');
		const articles = await this.getDecryptedArticles();
		const localArticle = articles.find(article => article.id === id);
		
		if (localArticle) {
			// Si encontramos el artículo localmente y es público, almacenarlo para compartir
			if (localArticle.isPublic) {
				this.storeArticleForSharing(localArticle);
			}
			return localArticle;
		}
		
		// Último intento: buscar en caché de artículos compartidos
		console.log('🔍 Trying shared cache...');
		const sharedArticle = this.getSharedArticle(id);
		if (sharedArticle) {
			return sharedArticle;
		}
		
		return null;
	}

	public storeArticleForSharing(article: Article): void {
		// Almacenar artículos públicos temporalmente para compartir
		if (!article.isPublic) return;
		
		try {
			const sharedArticles = JSON.parse(localStorage.getItem('sharedArticles') || '{}');
			sharedArticles[article.id] = {
				...article,
				sharedAt: Date.now(),
				expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 días
			};
			localStorage.setItem('sharedArticles', JSON.stringify(sharedArticles));
		} catch (error) {
			console.warn('Failed to store article for sharing:', error);
		}
	}

	public getSharedArticle(id: string): Article | null {
		try {
			const sharedArticles = JSON.parse(localStorage.getItem('sharedArticles') || '{}');
			const shared = sharedArticles[id];
			
			if (shared && shared.expiresAt > Date.now()) {
				console.log('📤 Found shared article in cache');
				return shared;
			} else if (shared) {
				// Limpiar artículo expirado
				delete sharedArticles[id];
				localStorage.setItem('sharedArticles', JSON.stringify(sharedArticles));
			}
		} catch (error) {
			console.warn('Failed to get shared article:', error);
		}
		return null;
	}

	public async getArticlesByAuthor(authorAddress: string): Promise<Article[]> {
		// Check if wallet is connected
		const walletState = get(walletStore);
		if (!walletState.isConnected || walletState.isManuallyDisconnected) {
			console.log('🚫 Wallet not connected, cannot access articles');
			return [];
		}

		const articles = await this.getDecryptedArticles();
		return articles.filter(article => article.author === authorAddress);
	}

	public async deleteArticle(articleId: string): Promise<boolean> {
		try {
			// Eliminar artículo cifrado
			const storedArticles = this.getStoredArticles();
			const filteredArticles = storedArticles.filter(article => article.id !== articleId);
			localStorage.setItem('articles', JSON.stringify(filteredArticles));

			// Eliminar clave
			const storedKeys = this.getStoredKeys();
			const filteredKeys = storedKeys.filter(key => key.articleId !== articleId);
			localStorage.setItem('articleKeys', JSON.stringify(filteredKeys));

			// Eliminar firma si existe
			const signatures = JSON.parse(localStorage.getItem('articleSignatures') || '{}');
			delete signatures[articleId];
			localStorage.setItem('articleSignatures', JSON.stringify(signatures));

			// Eliminar transacción si existe
			const transactions = JSON.parse(localStorage.getItem('articleTransactions') || '{}');
			delete transactions[articleId];
			localStorage.setItem('articleTransactions', JSON.stringify(transactions));

			return true;
		} catch (error) {
			console.error('Error deleting article:', error);
			return false;
		}
	}

	public async recoverMissingKeys(): Promise<number> {
		console.log('🔧 Starting key recovery process...');
		
		const encryptedArticles = this.getStoredArticles();
		const existingKeys = this.getStoredKeys();
		let recoveredCount = 0;

		for (const article of encryptedArticles) {
			// Solo intentar recuperar si no tenemos la clave ya
			const hasKey = existingKeys.some(key => key.articleId === article.id);
			
			if (!hasKey && article.metadata.isPublic) {
				console.log(`🔄 Attempting to recover key for public article: ${article.id}`);
				
				const recoveredKey = this.extractKeyFromPublicPayload(article.id);
				if (recoveredKey) {
					const keyObject = {
						key: recoveredKey,
						articleId: article.id,
						isPublic: true
					};
					
					this.storeArticleKey(keyObject);
					recoveredCount++;
					console.log(`✅ Recovered key for article: ${article.id}`);
				}
			}
		}

		console.log(`🎉 Key recovery complete. Recovered ${recoveredCount} keys.`);
		return recoveredCount;
	}

	public generateShareableURL(article: Article, compress: boolean = true): string {
		// Solo permitir compartir artículos públicos
		if (!article.isPublic) {
			throw new Error('Cannot share private articles');
		}

		try {
			// Crear datos ultra-mínimos para compartir
			const shareData = {
				i: article.id,
				t: article.title,
				c: article.content,
				a: article.author,
				d: article.createdAt,
				p: 1, // isPublic siempre true para compartidos
				...(article.image && { img: article.image }),
				x: article.txId
			};

			let encoded: string;

			if (compress) {
				// Comprimir con pako y luego base64
				const jsonString = JSON.stringify(shareData);
				const compressed = this.compressString(jsonString);
				encoded = compressed;
			} else {
				// Solo base64 (método anterior) 
				encoded = btoa(JSON.stringify(shareData));
			}
			
			// Generar URL
			const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
			const param = compress ? 'c' : 'shared';
			return `${baseUrl}/articles/${article.id}?${param}=${encoded}`;
		} catch (error) {
			console.error('Error generating shareable URL:', error);
			throw new Error('Failed to generate shareable URL');
		}
	}

	private compressString(str: string): string {
		try {
			// Importar pako de forma dinámica
			const pako = require('pako');
			
			// Comprimir con máxima compresión
			const compressed = pako.deflate(str, { 
				level: 9,
				windowBits: 15,
				memLevel: 9,
				strategy: 0
			});
			
			// Convertir a base64 URL-safe más eficiente
			const uint8Array = new Uint8Array(compressed);
			let binaryString = '';
			const chunkSize = 8192;
			
			for (let i = 0; i < uint8Array.length; i += chunkSize) {
				const chunk = uint8Array.slice(i, i + chunkSize);
				binaryString += String.fromCharCode.apply(null, Array.from(chunk));
			}
			
			const base64 = btoa(binaryString);
			return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
		} catch (error) {
			console.warn('Compression failed, falling back to regular base64:', error);
			return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
		}
	}

	private decompressString(compressed: string): string {
		try {
			// Importar pako de forma dinámica
			const pako = require('pako');
			
			// Restaurar caracteres base64
			let base64 = compressed.replace(/-/g, '+').replace(/_/g, '/');
			while (base64.length % 4) {
				base64 += '=';
			}
			
			// Decodificar base64
			const binaryString = atob(base64);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			
			// Descomprimir
			const decompressed = pako.inflate(bytes, { to: 'string' });
			return decompressed;
		} catch (error) {
			console.warn('Decompression failed, trying regular base64:', error);
			return atob(compressed);
		}
	}

	public getArticleStats() {
		const articles = this.getStoredArticles();
		const keys = this.getStoredKeys();
		const signatures = JSON.parse(localStorage.getItem('articleSignatures') || '{}');
		const transactions = JSON.parse(localStorage.getItem('articleTransactions') || '{}');

		return {
			totalArticles: articles.length,
			totalKeys: keys.length,
			totalSignatures: Object.keys(signatures).length,
			totalTransactions: Object.keys(transactions).length,
			publicArticles: articles.filter(a => a.metadata.isPublic).length,
			privateArticles: articles.filter(a => !a.metadata.isPublic).length,
			articlesWithKeys: articles.filter(a => 
				keys.some(k => k.articleId === a.id)
			).length,
			articlesWithoutKeys: articles.filter(a => 
				!keys.some(k => k.articleId === a.id)
			).length
		};
	}
}

export const articleService = ArticleService.getInstance();