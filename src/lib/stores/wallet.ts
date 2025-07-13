import { writable, derived, get } from 'svelte/store';
import { kaswareService } from '../services/kasware.js';

export interface WalletState {
	isConnected: boolean;
	address: string | null;
	balance: { confirmed: number; unconfirmed: number } | null;
	isLoading: boolean;
	error: string | null;
	isManuallyDisconnected: boolean;
}

// Check if user manually disconnected (persisted in localStorage)
const getStoredDisconnectStatus = (): boolean => {
	if (typeof window === 'undefined') return false;
	return localStorage.getItem('kasware_manually_disconnected') === 'true';
};

const initialState: WalletState = {
	isConnected: false,
	address: null,
	balance: null,
	isLoading: false,
	error: null,
	isManuallyDisconnected: getStoredDisconnectStatus()
};

export const walletStore = writable<WalletState>(initialState);

export const walletActions = {
	async checkConnection() {
		walletStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			if (!kaswareService.isInstalled()) {
				throw new Error('KasWare wallet not installed');
			}

			// Don't auto-reconnect if user manually disconnected
			const currentState = get(walletStore);
			if (currentState.isManuallyDisconnected) {
				walletStore.update((state) => ({ ...state, isLoading: false }));
				return;
			}

			const accounts = await kaswareService.getAccounts();

			if (accounts.length > 0) {
				const balance = await kaswareService.getBalance();
				walletStore.update((state) => ({
					...state,
					isConnected: true,
					address: accounts[0],
					balance,
					isLoading: false
				}));
			} else {
				walletStore.update((state) => ({
					...state,
					isConnected: false,
					address: null,
					balance: null,
					isLoading: false
				}));
			}
		} catch (error) {
			walletStore.update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Unknown error',
				isLoading: false
			}));
		}
	},

	async connect() {
		walletStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			if (!kaswareService.isInstalled()) {
				throw new Error(
					'KasWare wallet not installed. Please install it from the Chrome Web Store.'
				);
			}

			const accounts = await kaswareService.connect();

			if (accounts.length > 0) {
				const balance = await kaswareService.getBalance();
				if (typeof window !== 'undefined') {
					localStorage.removeItem('kasware_manually_disconnected');
				}
				walletStore.update((state) => ({
					...state,
					isConnected: true,
					address: accounts[0],
					balance,
					isLoading: false,
					isManuallyDisconnected: false
				}));
			} else {
				throw new Error('No accounts found');
			}
		} catch (error) {
			walletStore.update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to connect wallet',
				isLoading: false
			}));
		}
	},

	async disconnect() {
		walletStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			await kaswareService.disconnect();
			kaswareService.removeAllListeners();
			if (typeof window !== 'undefined') {
				localStorage.setItem('kasware_manually_disconnected', 'true');
			}
			walletStore.set({ ...initialState, isManuallyDisconnected: true });
		} catch (error) {
			walletStore.update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
				isLoading: false
			}));
		}
	},

	async refreshBalance() {
		walletStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			if (!kaswareService.isInstalled()) {
				throw new Error('KasWare wallet not installed');
			}

			const balance = await kaswareService.getBalance();
			walletStore.update((state) => ({
				...state,
				balance,
				isLoading: false
			}));
		} catch (error) {
			walletStore.update((state) => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to refresh balance',
				isLoading: false
			}));
		}
	},

	clearError() {
		walletStore.update((state) => ({ ...state, error: null }));
	},

	setupEventListeners() {
		if (!kaswareService.isInstalled()) {
			return;
		}

		kaswareService.onAccountsChanged(async (accounts: string[]) => {
			const currentState = get(walletStore);
			if (currentState.isManuallyDisconnected) {
				return;
			}
			
			if (accounts.length > 0) {
				const balance = await kaswareService.getBalance();
				walletStore.update((state) => ({
					...state,
					isConnected: true,
					address: accounts[0],
					balance
				}));
			} else {
				walletStore.set(initialState);
			}
		});

		kaswareService.onBalanceChanged(async (balance: unknown) => {
			walletStore.update((state) => ({
				...state,
				balance: balance as { confirmed: number; unconfirmed: number } | null
			}));
		});

		kaswareService.onNetworkChanged(async () => {
			await walletActions.refreshBalance();
		});
	}
};

export const isWalletInstalled = derived(walletStore, () => kaswareService.isInstalled());

export const shortAddress = derived(walletStore, ($walletStore) => {
	if (!$walletStore.address) return null;
	const address = $walletStore.address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
});

export const balanceInKAS = derived(walletStore, ($walletStore) => {
	if (!$walletStore.balance) return null;
	return ($walletStore.balance.confirmed / 100000000).toFixed(8);
});
