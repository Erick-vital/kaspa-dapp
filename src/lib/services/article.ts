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
		const encryptedArticles = this.getStoredArticles();
		const keys = this.getStoredKeys();
		const decryptedArticles: Article[] = [];

		for (const encryptedArticle of encryptedArticles) {
			try {
				// Buscar la clave correspondiente
				const articleKey = keys.find(key => key.articleId === encryptedArticle.id);
				
				if (articleKey) {
					const decryptedArticle = await this.decryptArticle(encryptedArticle, articleKey.key);
					decryptedArticles.push(decryptedArticle);
				} else {
					// Si no hay clave pero es público, intentar extraer de payload
					if (encryptedArticle.metadata.isPublic) {
						const key = this.extractKeyFromPublicPayload(encryptedArticle.id);
						if (key) {
							const decryptedArticle = await this.decryptArticle(encryptedArticle, key);
							decryptedArticles.push(decryptedArticle);
						}
					}
				}
			} catch (error) {
				console.warn(`Failed to decrypt article ${encryptedArticle.id}:`, error);
			}
		}

		// Ordenar por fecha de creación (más recientes primero)
		return decryptedArticles.sort((a, b) => b.createdAt - a.createdAt);
	}

	private extractKeyFromPublicPayload(articleId: string): string | null {
		try {
			// Intentar extraer clave de signatures almacenadas
			const signatures = localStorage.getItem('articleSignatures') || '{}';
			const signaturesData = JSON.parse(signatures);
			
			if (signaturesData[articleId]) {
				const payload = JSON.parse(signaturesData[articleId].payload);
				return payload.key || null;
			}

			// Intentar extraer clave de transactions almacenadas  
			const transactions = localStorage.getItem('articleTransactions') || '{}';
			const transactionsData = JSON.parse(transactions);
			
			if (transactionsData[articleId]) {
				const payload = JSON.parse(transactionsData[articleId].payload);
				return payload.key || null;
			}

			return null;
		} catch {
			return null;
		}
	}

	public async getArticleById(id: string): Promise<Article | null> {
		const articles = await this.getDecryptedArticles();
		return articles.find(article => article.id === id) || null;
	}

	public getArticlesByAuthor(authorAddress: string): Promise<Article[]> {
		return this.getDecryptedArticles().then(articles => 
			articles.filter(article => article.author === authorAddress)
		);
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
}

export const articleService = ArticleService.getInstance();