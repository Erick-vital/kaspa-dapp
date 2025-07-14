<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import {
		walletStore,
		walletActions,
		isWalletInstalled,
		shortAddress
	} from '$lib/stores/wallet.js';
	import { authStore, authActions, isAuthenticated } from '$lib/stores/auth.js';
	import { kaspaAuthService } from '$lib/services/kaspaAuth.js';
	import DebugPanel from '$lib/components/DebugPanel.svelte';

	let { children } = $props();

	onMount(() => {
		// Reset del sistema para desarrollo - limpiar datos antiguos
		if (typeof window !== 'undefined') {
			const currentVersion = '2.0.0'; // Nueva versión con Kaspa Auth
			const storedVersion = localStorage.getItem('kaspa_dapp_version');
			
			if (storedVersion !== currentVersion) {
				console.log('🔄 Resetting to new Kaspa Auth system...');
				kaspaAuthService.clearAllAuthData();
				localStorage.setItem('kaspa_dapp_version', currentVersion);
				console.log('✅ Reset completed - ready for Kaspa Auth!');
			}
		}
		
		walletActions.checkConnection();
		walletActions.setupEventListeners();
	});

	function handleConnectWallet() {
		walletActions.connect();
	}

	function handleDisconnectWallet() {
		walletActions.disconnect();
	}

	function handleAuthenticate() {
		authActions.authenticate();
	}

	function handleLogout() {
		authActions.logout();
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b bg-white shadow-sm">
		<nav class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center">
					<a href="/" class="text-2xl font-bold text-gray-900">My Blog</a>
				</div>
				<div class="flex items-center space-x-4">
					<a href="/" class="text-gray-700 hover:text-gray-900">Home</a>
					<a href="/articles" class="text-gray-700 hover:text-gray-900">Articles</a>
					<a href="/create" class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						>Write</a
					>

					{#if !$isWalletInstalled}
						<a
							href="https://chromewebstore.google.com/detail/kasware-wallet/hklhheigdmpoolooomdihmhlpjjdbklf"
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
						>
							Install KasWare
						</a>
					{:else if $walletStore.isConnected}
						<div class="flex items-center space-x-4">
							<!-- Authentication Status -->
							{#if $isAuthenticated}
								<div class="flex items-center space-x-2">
									<span class="text-sm text-blue-600">🔐</span>
									<span class="text-xs text-blue-600">Authenticated</span>
									<button
										on:click={handleLogout}
										class="text-xs text-blue-600 hover:text-blue-800 underline"
									>
										Logout
									</button>
								</div>
							{:else}
								<button
									on:click={handleAuthenticate}
									disabled={$authStore.isLoading}
									class="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
								>
									{#if $authStore.isLoading}
										Authenticating...
									{:else}
										🔐 Authenticate
									{/if}
								</button>
							{/if}
							
							<!-- Wallet Info -->
							<div class="flex items-center space-x-2">
								<span class="text-sm text-green-600">●</span>
								<span class="font-mono text-sm text-gray-700">{$shortAddress}</span>
								<button
									on:click={handleDisconnectWallet}
									disabled={$walletStore.isLoading}
									class="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
								>
									Disconnect
								</button>
							</div>
						</div>
					{:else}
						<button
							on:click={handleConnectWallet}
							disabled={$walletStore.isLoading}
							class="rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{$walletStore.isLoading ? 'Connecting...' : 'Connect KasWare'}
						</button>
					{/if}
				</div>
			</div>
		</nav>
	</header>

	<main class="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
		{@render children()}
	</main>

	<footer class="mt-12 border-t bg-white">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<p class="text-center text-gray-500">© 2025 My Blog. All rights reserved.</p>
		</div>
	</footer>
</div>

<!-- Debug Panel -->
<DebugPanel />
