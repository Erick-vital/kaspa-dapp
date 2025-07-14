export interface Article {
	id: string;
	title: string;
	content: string;
	summary?: string;
	tags: string[];
	image?: string;
	isPublic: boolean;
	price?: number; // en sompi para artículos privados
	author: string; // dirección kaspa del autor
	createdAt: number; // timestamp
	updatedAt: number; // timestamp
	txId: string; // ID de la transacción en kaspa
}

export interface EncryptedArticle {
	id: string;
	encryptedContent: string; // contenido cifrado con ChaCha20Poly1305
	nonce: string; // nonce usado para el cifrado
	metadata: ArticleMetadata;
	txId: string;
}

export interface ArticleMetadata {
	title: string;
	summary?: string;
	tags: string[];
	image?: string;
	isPublic: boolean;
	price?: number;
	author: string;
	createdAt: number;
	updatedAt: number;
	contentSize: number; // tamaño del contenido original en bytes
}

export interface ArticleKey {
	key: string; // clave de cifrado base64
	articleId: string;
	isPublic: boolean;
}

export interface ArticlePayload {
	type: 'article';
	version: '1.0';
	data: EncryptedArticle;
}

export interface CreateArticleRequest {
	title: string;
	content: string;
	summary?: string;
	tags: string[];
	image?: string;
	isPublic: boolean;
	price?: number;
}

export interface PublishResult {
	success: boolean;
	articleId?: string;
	txId?: string;
	error?: string;
	fee?: number;
	sharedKeyInfo?: {
		keyId: string;
		key: string;
		createdAt: number;
		articleId: string;
	};
}