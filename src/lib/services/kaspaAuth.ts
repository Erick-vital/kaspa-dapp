import { kaswareService } from './kasware.js';
import { keyDerivationService } from './keyDerivation.js';
import { sha256 } from '@noble/hashes/sha256';

export interface AuthChallenge {
	challenge: string;
	timestamp: number;
	address: string;
}

export interface AuthSession {
	sessionToken: string;
	address: string;
	authenticated: boolean;
	expiresAt: number;
	createdAt: number;
}

export interface AuthResult {
	success: boolean;
	session?: AuthSession;
	error?: string;
}

export class KaspaAuthService {
	private static instance: KaspaAuthService;
	private currentSession: AuthSession | null = null;
	private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas en ms

	private constructor() {
		this.loadSessionFromStorage();
	}

	public static getInstance(): KaspaAuthService {
		if (!KaspaAuthService.instance) {
			KaspaAuthService.instance = new KaspaAuthService();
		}
		return KaspaAuthService.instance;
	}

	/**
	 * Inicia el proceso de autenticación con challenge/response
	 */
	public async authenticate(): Promise<AuthResult> {
		try {
			if (!kaswareService.isInstalled()) {
				return {
					success: false,
					error: 'KasWare wallet no está instalada'
				};
			}

			// Verificar que la wallet esté conectada
			const accounts = await kaswareService.getAccounts();
			if (accounts.length === 0) {
				// Intentar conectar automáticamente
				await kaswareService.connect();
				const newAccounts = await kaswareService.getAccounts();
				if (newAccounts.length === 0) {
					return {
						success: false,
						error: 'No se pudo conectar con la wallet'
					};
				}
			}

			const address = accounts[0];

			// Generar challenge
			const challenge = this.generateChallenge(address);

			// Solicitar firma del challenge
			const signature = await kaswareService.signMessage(challenge.challenge);

			// Verificar firma (simplificado - en producción se haría verificación criptográfica completa)
			const isValid = await this.verifySignature(challenge, signature, address);

			if (!isValid) {
				return {
					success: false,
					error: 'Firma inválida'
				};
			}

			// Crear sesión
			const session = this.createSession(address);
			this.currentSession = session;
			this.saveSessionToStorage(session);

			return {
				success: true,
				session
			};

		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Error de autenticación desconocido'
			};
		}
	}

	/**
	 * Verifica si hay una sesión activa y válida
	 */
	public isAuthenticated(): boolean {
		if (!this.currentSession) {
			return false;
		}

		// Verificar expiración
		if (Date.now() > this.currentSession.expiresAt) {
			this.logout();
			return false;
		}

		return this.currentSession.authenticated;
	}

	/**
	 * Obtiene la sesión actual
	 */
	public getCurrentSession(): AuthSession | null {
		if (!this.isAuthenticated()) {
			return null;
		}
		return this.currentSession;
	}

	/**
	 * Obtiene la dirección de la wallet autenticada
	 */
	public getAuthenticatedAddress(): string | null {
		const session = this.getCurrentSession();
		return session?.address || null;
	}

	/**
	 * Cierra la sesión actual
	 */
	public logout(): void {
		this.currentSession = null;
		this.clearSessionFromStorage();
	}

	/**
	 * Refresca la sesión actual (extiende tiempo de vida)
	 */
	public async refreshSession(): Promise<boolean> {
		if (!this.currentSession) {
			return false;
		}

		try {
			// Verificar que la wallet siga conectada con la misma dirección
			const accounts = await kaswareService.getAccounts();
			if (accounts.length === 0 || accounts[0] !== this.currentSession.address) {
				this.logout();
				return false;
			}

			// Extender expiración
			this.currentSession.expiresAt = Date.now() + this.SESSION_DURATION;
			this.saveSessionToStorage(this.currentSession);
			
			return true;
		} catch {
			this.logout();
			return false;
		}
	}

	/**
	 * Verifica si el usuario puede acceder a un artículo privado
	 */
	public async canAccessPrivateArticle(articleId: string): Promise<boolean> {
		if (!this.isAuthenticated()) {
			return false;
		}

		try {
			// Intentar derivar la clave para verificar acceso
			await keyDerivationService.derivePrivateArticleKey(articleId);
			return true;
		} catch {
			return false;
		}
	}

	// === Métodos privados ===

	private generateChallenge(address: string): AuthChallenge {
		const timestamp = Date.now();
		const randomData = Math.random().toString(36).substring(2);
		const challenge = `kaspa-auth-challenge:${address}:${timestamp}:${randomData}`;
		
		return {
			challenge,
			timestamp,
			address
		};
	}

	private async verifySignature(challenge: AuthChallenge, signature: string, address: string): Promise<boolean> {
		try {
			// Verificación simplificada: confirmar que la firma fue generada
			// En una implementación completa, aquí se haría verificación criptográfica con secp256k1
			
			// Por ahora, verificamos que:
			// 1. La firma tenga formato válido (hex)
			// 2. La dirección coincida
			// 3. El challenge no sea muy antiguo (5 minutos)
			
			const isValidHex = /^[0-9a-fA-F]+$/.test(signature);
			const isValidAddress = challenge.address === address;
			const isRecentChallenge = (Date.now() - challenge.timestamp) < 5 * 60 * 1000; // 5 minutos
			
			return isValidHex && isValidAddress && isRecentChallenge && signature.length > 0;
		} catch {
			return false;
		}
	}

	private createSession(address: string): AuthSession {
		const now = Date.now();
		const sessionData = `session:${address}:${now}`;
		const sessionToken = btoa(
			Array.from(sha256(new TextEncoder().encode(sessionData)))
				.map(b => String.fromCharCode(b))
				.join('')
		).substring(0, 32); // Token de 32 caracteres
		
		return {
			sessionToken,
			address,
			authenticated: true,
			expiresAt: now + this.SESSION_DURATION,
			createdAt: now
		};
	}

	private saveSessionToStorage(session: AuthSession): void {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('kaspa_auth_session', JSON.stringify(session));
			} catch (error) {
				console.warn('No se pudo guardar sesión en localStorage:', error);
			}
		}
	}

	private loadSessionFromStorage(): void {
		if (typeof window !== 'undefined') {
			try {
				const stored = localStorage.getItem('kaspa_auth_session');
				if (stored) {
					const session: AuthSession = JSON.parse(stored);
					
					// Verificar que no haya expirado
					if (Date.now() < session.expiresAt) {
						this.currentSession = session;
					} else {
						this.clearSessionFromStorage();
					}
				}
			} catch (error) {
				console.warn('Error cargando sesión desde localStorage:', error);
				this.clearSessionFromStorage();
			}
		}
	}

	private clearSessionFromStorage(): void {
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('kaspa_auth_session');
			} catch (error) {
				console.warn('Error limpiando sesión de localStorage:', error);
			}
		}
	}

	/**
	 * Limpia todas las sesiones y datos de autenticación
	 * Útil para reset durante desarrollo
	 */
	public clearAllAuthData(): void {
		this.logout();
		if (typeof window !== 'undefined') {
			// Limpiar todos los datos relacionados con auth
			const keysToRemove = [
				'kaspa_auth_session',
				'articles', // Reset del sistema existente
				'articleKeys',
				'articleSignatures', 
				'articleTransactions',
				'articleDraft'
			];
			
			keysToRemove.forEach(key => {
				try {
					localStorage.removeItem(key);
				} catch (error) {
					console.warn(`Error removiendo ${key}:`, error);
				}
			});
		}
	}
}

export const kaspaAuthService = KaspaAuthService.getInstance();