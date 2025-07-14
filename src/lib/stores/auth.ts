import { writable, derived, get } from 'svelte/store';
import { kaspaAuthService, type AuthSession } from '../services/kaspaAuth.js';
import { walletStore } from './wallet.js';

export interface AuthState {
	isAuthenticated: boolean;
	session: AuthSession | null;
	isLoading: boolean;
	error: string | null;
}

const initialState: AuthState = {
	isAuthenticated: false,
	session: null,
	isLoading: false,
	error: null
};

export const authStore = writable<AuthState>(initialState);

export const authActions = {
	/**
	 * Inicia el proceso de autenticación con Kaspa challenge/response
	 */
	async authenticate() {
		authStore.update(state => ({ ...state, isLoading: true, error: null }));

		try {
			const result = await kaspaAuthService.authenticate();
			
			if (result.success && result.session) {
				authStore.update(state => ({
					...state,
					isAuthenticated: true,
					session: result.session!,
					isLoading: false,
					error: null
				}));
			} else {
				authStore.update(state => ({
					...state,
					isAuthenticated: false,
					session: null,
					isLoading: false,
					error: result.error || 'Error de autenticación desconocido'
				}));
			}
		} catch (error) {
			authStore.update(state => ({
				...state,
				isAuthenticated: false,
				session: null,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Error de autenticación'
			}));
		}
	},

	/**
	 * Cierra la sesión actual
	 */
	logout() {
		kaspaAuthService.logout();
		authStore.set(initialState);
	},

	/**
	 * Verifica el estado de autenticación actual
	 */
	checkAuthStatus() {
		const isAuthenticated = kaspaAuthService.isAuthenticated();
		const session = kaspaAuthService.getCurrentSession();
		
		authStore.update(state => ({
			...state,
			isAuthenticated,
			session,
			isLoading: false
		}));
	},

	/**
	 * Refresca la sesión actual (extiende tiempo de vida)
	 */
	async refreshSession() {
		const currentState = get(authStore);
		if (!currentState.isAuthenticated) {
			return false;
		}

		try {
			const refreshed = await kaspaAuthService.refreshSession();
			
			if (refreshed) {
				const session = kaspaAuthService.getCurrentSession();
				authStore.update(state => ({
					...state,
					session,
					error: null
				}));
				return true;
			} else {
				// Sesión no válida, logout automático
				authActions.logout();
				return false;
			}
		} catch (error) {
			authActions.logout();
			return false;
		}
	},

	/**
	 * Verifica si el usuario puede acceder a un artículo privado específico
	 */
	async canAccessPrivateArticle(articleId: string): Promise<boolean> {
		const currentState = get(authStore);
		if (!currentState.isAuthenticated) {
			return false;
		}

		try {
			return await kaspaAuthService.canAccessPrivateArticle(articleId);
		} catch {
			return false;
		}
	},

	/**
	 * Limpia cualquier error de autenticación
	 */
	clearError() {
		authStore.update(state => ({ ...state, error: null }));
	},

	/**
	 * Limpia todos los datos de autenticación (útil para reset durante desarrollo)
	 */
	resetAuthSystem() {
		kaspaAuthService.clearAllAuthData();
		authStore.set(initialState);
	}
};

// Derived stores para fácil acceso
export const isAuthenticated = derived(authStore, $authStore => $authStore.isAuthenticated);
export const currentSession = derived(authStore, $authStore => $authStore.session);
export const authError = derived(authStore, $authStore => $authStore.error);
export const isAuthLoading = derived(authStore, $authStore => $authStore.isLoading);

// Derived store que combina wallet y auth
export const walletAuthStatus = derived(
	[walletStore, authStore],
	([$walletStore, $authStore]) => ({
		walletConnected: $walletStore.isConnected,
		walletAddress: $walletStore.address,
		authenticated: $authStore.isAuthenticated,
		authSession: $authStore.session,
		canCreatePrivateArticles: $walletStore.isConnected && $authStore.isAuthenticated,
		needsAuth: $walletStore.isConnected && !$authStore.isAuthenticated
	})
);

// Información del usuario autenticado
export const authenticatedUser = derived(authStore, $authStore => {
	if (!$authStore.isAuthenticated || !$authStore.session) {
		return null;
	}
	
	return {
		address: $authStore.session.address,
		sessionToken: $authStore.session.sessionToken,
		expiresAt: $authStore.session.expiresAt,
		timeRemaining: Math.max(0, $authStore.session.expiresAt - Date.now())
	};
});

// Auto-inicialización del estado de auth cuando se importa el store
if (typeof window !== 'undefined') {
	// Verificar estado inicial
	authActions.checkAuthStatus();
	
	// Configurar refresh automático cada 5 minutos
	setInterval(() => {
		const currentState = get(authStore);
		if (currentState.isAuthenticated) {
			authActions.refreshSession();
		}
	}, 5 * 60 * 1000); // 5 minutos
}