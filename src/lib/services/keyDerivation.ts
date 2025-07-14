import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { kaswareService } from './kasware.js';

export interface KeyDerivationResult {
	key: string; // base64 encoded 32-byte key
	derivationMethod: 'wallet' | 'shared';
	metadata?: {
		walletAddress?: string;
		sharedKeyId?: string;
	};
}

export interface SharedKeyInfo {
	keyId: string;
	key: string; // base64 encoded
	createdAt: number;
	articleId: string;
}

export class KeyDerivationService {
	private static instance: KeyDerivationService;

	private constructor() {}

	public static getInstance(): KeyDerivationService {
		if (!KeyDerivationService.instance) {
			KeyDerivationService.instance = new KeyDerivationService();
		}
		return KeyDerivationService.instance;
	}

	/**
	 * Deriva una clave específica para un artículo privado usando la wallet del usuario
	 * Flujo: wallet.signMessage() → HKDF → clave específica del artículo
	 */
	public async derivePrivateArticleKey(articleId: string): Promise<KeyDerivationResult> {
		if (!kaswareService.isInstalled()) {
			throw new Error('KasWare wallet no está instalada');
		}

		try {
			// Obtener dirección de la wallet para usar como parte del contexto
			const accounts = await kaswareService.getAccounts();
			if (accounts.length === 0) {
				throw new Error('No hay cuentas conectadas en la wallet');
			}
			const walletAddress = accounts[0];

			// Crear mensaje determinístico para firmar
			const message = `kaspa-auth-master-key:${walletAddress}:${Date.now().toString().slice(0, -6)}000`; // Redondeado a minutos para estabilidad
			
			// Firmar mensaje con la wallet - esto actúa como nuestra "master key"
			const signature = await kaswareService.signMessage(message);
			
			// Convertir signature hex a bytes para usar como seed
			const signatureBytes = new Uint8Array(
				signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
			);

			// Usar HKDF para derivar clave específica del artículo
			const info = new TextEncoder().encode(`article:${articleId}`);
			const salt = new TextEncoder().encode('kaspa-dapp-v1');
			
			// Derivar 32 bytes para ChaCha20Poly1305
			const derivedKey = hkdf(sha256, signatureBytes, salt, info, 32);
			
			// Convertir a base64 para compatibilidad con crypto service
			const keyBase64 = btoa(String.fromCharCode(...derivedKey));

			return {
				key: keyBase64,
				derivationMethod: 'wallet',
				metadata: {
					walletAddress
				}
			};
		} catch (error) {
			throw new Error(
				`Error derivando clave privada: ${error instanceof Error ? error.message : 'Error desconocido'}`
			);
		}
	}

	/**
	 * Genera una shared key para artículos públicos
	 * Esta clave se incluirá en la URL para sharing
	 */
	public generateSharedKey(articleId: string): SharedKeyInfo {
		try {
			// Generar clave aleatoria de 32 bytes
			const keyBytes = randomBytes(32);
			const key = btoa(String.fromCharCode(...keyBytes));
			
			// Generar ID único para la shared key (más corto para URLs)
			const keyIdBytes = randomBytes(16);
			const keyId = btoa(String.fromCharCode(...keyIdBytes))
				.replace(/[+/=]/g, '') // Remover caracteres problemáticos para URLs
				.slice(0, 16); // Mantener corto

			return {
				keyId,
				key,
				createdAt: Date.now(),
				articleId
			};
		} catch (error) {
			throw new Error(
				`Error generando shared key: ${error instanceof Error ? error.message : 'Error desconocido'}`
			);
		}
	}

	/**
	 * Valida que una clave derivada siga siendo válida
	 * Para claves privadas, verifica que la wallet siga conectada
	 */
	public async validateKey(keyResult: KeyDerivationResult): Promise<boolean> {
		if (keyResult.derivationMethod === 'shared') {
			// Las shared keys siempre son válidas si existen
			return true;
		}

		if (keyResult.derivationMethod === 'wallet') {
			try {
				// Verificar que la wallet siga conectada con la misma dirección
				const accounts = await kaswareService.getAccounts();
				return accounts.length > 0 && accounts[0] === keyResult.metadata?.walletAddress;
			} catch {
				return false;
			}
		}

		return false;
	}

	/**
	 * Re-deriva una clave para verificar que el usuario sigue teniendo acceso
	 * Útil para validar acceso a artículos privados
	 */
	public async revalidatePrivateAccess(articleId: string, expectedKey: string): Promise<boolean> {
		try {
			const derivedResult = await this.derivePrivateArticleKey(articleId);
			return derivedResult.key === expectedKey;
		} catch {
			return false;
		}
	}

	/**
	 * Obtiene información de la wallet actual para logging/debugging
	 */
	public async getCurrentWalletInfo(): Promise<{ address: string; isConnected: boolean }> {
		try {
			if (!kaswareService.isInstalled()) {
				return { address: '', isConnected: false };
			}
			
			const accounts = await kaswareService.getAccounts();
			return {
				address: accounts[0] || '',
				isConnected: accounts.length > 0
			};
		} catch {
			return { address: '', isConnected: false };
		}
	}
}

export const keyDerivationService = KeyDerivationService.getInstance();