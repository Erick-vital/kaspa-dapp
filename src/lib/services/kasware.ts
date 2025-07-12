export interface TransactionWithData {
	toAddress?: string;
	sompi?: number;
	data?: string;
}

export interface KaswareWallet {
	requestAccounts(): Promise<string[]>;
	getAccounts(): Promise<string[]>;
	getBalance(): Promise<{ confirmed: number; unconfirmed: number }>;
	sendKaspa(toAddress: string, sompi: number): Promise<string>;
	sendTransaction?(transaction: TransactionWithData): Promise<string>;
	signMessage(message: string): Promise<string>;
	getKRC20Balance(): Promise<unknown>;
	getVersion(): Promise<string>;
	getNetwork(): Promise<string>;
	switchNetwork(network: string): Promise<void>;
	disconnect(): Promise<void>;
	getPublicKey(): Promise<string>;
	on(event: string, callback: (data: unknown) => void): void;
	removeListener(event: string, callback: (data: unknown) => void): void;
}

declare global {
	interface Window {
		kasware?: KaswareWallet;
	}
}

export class KaswareService {
	private static instance: KaswareService;
	private wallet: KaswareWallet | null = null;

	private constructor() {
		this.wallet = typeof window !== 'undefined' ? window.kasware || null : null;
	}

	public static getInstance(): KaswareService {
		if (!KaswareService.instance) {
			KaswareService.instance = new KaswareService();
		}
		return KaswareService.instance;
	}

	public isInstalled(): boolean {
		return typeof window !== 'undefined' && typeof window.kasware !== 'undefined';
	}

	public async connect(): Promise<string[]> {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		try {
			const accounts = await this.wallet.requestAccounts();
			return accounts;
		} catch (error) {
			throw new Error(`Failed to connect wallet: ${error}`);
		}
	}

	public async getAccounts(): Promise<string[]> {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		try {
			const accounts = await this.wallet.getAccounts();
			return accounts;
		} catch (error) {
			throw new Error(`Failed to get accounts: ${error}`);
		}
	}

	public async getBalance(): Promise<{ confirmed: number; unconfirmed: number }> {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		try {
			const balance = await this.wallet.getBalance();
			return balance;
		} catch (error) {
			throw new Error(`Failed to get balance: ${error}`);
		}
	}

	public async sendKaspa(toAddress: string, sompi: number): Promise<string> {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		try {
			const txId = await this.wallet.sendKaspa(toAddress, sompi);
			return txId;
		} catch (error) {
			throw new Error(`Failed to send Kaspa: ${error}`);
		}
	}

	public async signMessage(message: string): Promise<string> {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		try {
			const signature = await this.wallet.signMessage(message);
			return signature;
		} catch (error) {
			throw new Error(`Failed to sign message: ${error}`);
		}
	}

	public async disconnect(): Promise<void> {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		try {
			await this.wallet.disconnect();
		} catch (error) {
			throw new Error(`Failed to disconnect wallet: ${error}`);
		}
	}

	public onAccountsChanged(callback: (accounts: string[]) => void): void {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		this.wallet.on('accountsChanged', callback);
	}

	public onNetworkChanged(callback: (network: string) => void): void {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		this.wallet.on('networkChanged', callback);
	}

	public onBalanceChanged(callback: (balance: unknown) => void): void {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		this.wallet.on('balanceChanged', callback);
	}

	public async sendTransaction(transaction: TransactionWithData): Promise<string> {
		if (!this.wallet) {
			throw new Error('KasWare wallet not installed');
		}

		try {
			if (this.wallet.sendTransaction) {
				return await this.wallet.sendTransaction(transaction);
			} else {
				if (!transaction.toAddress || transaction.sompi === undefined) {
					throw new Error('sendTransaction not supported, fallback requires toAddress and sompi');
				}
				console.warn('Using fallback sendKaspa - data will be ignored');
				return await this.wallet.sendKaspa(transaction.toAddress, transaction.sompi);
			}
		} catch (error) {
			throw new Error(`Failed to send transaction: ${error}`);
		}
	}

	public async sendTransactionWithData(data: string, toAddress?: string, sompi?: number): Promise<string> {
		const transaction: TransactionWithData = {
			data,
			...(toAddress && { toAddress }),
			...(sompi !== undefined && { sompi })
		};

		return this.sendTransaction(transaction);
	}

	public removeAllListeners(): void {
		if (!this.wallet) {
			return;
		}

		// Remove common event listeners
		this.wallet.removeListener('accountsChanged', () => {});
		this.wallet.removeListener('networkChanged', () => {});
		this.wallet.removeListener('balanceChanged', () => {});
	}
}

export const kaswareService = KaswareService.getInstance();
