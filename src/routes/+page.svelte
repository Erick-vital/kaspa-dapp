<script lang="ts">
	import {
		walletStore,
		walletActions,
		isWalletInstalled,
		shortAddress
	} from '$lib/stores/wallet.js';


	function handleConnectWallet() {
		walletActions.connect();
	}

	function handleDisconnectWallet() {
		walletActions.disconnect();
	}
</script>

<div class="px-4 sm:px-6 lg:px-8">
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold text-gray-900">Welcome to My Blog</h1>
		<p class="mx-auto max-w-2xl text-xl text-gray-600">
			Discover articles about web development, technology and programming
		</p>
	</div>

	<div class="mb-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
		<div class="rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-3 text-xl font-semibold text-gray-900">Featured Articles</h2>
			<p class="mb-4 text-gray-600">Explore the most popular and best-rated articles</p>
			<a href="/articles" class="font-medium text-blue-600 hover:text-blue-800">
				View articles →
			</a>
		</div>

		<div class="rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-3 text-xl font-semibold text-gray-900">Share Your Knowledge</h2>
			<p class="mb-4 text-gray-600">Create and publish your own articles</p>
			<a href="/create" class="font-medium text-blue-600 hover:text-blue-800"> Write article → </a>
		</div>

		<div class="rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-3 text-xl font-semibold text-gray-900">Connect Your Wallet</h2>
			<p class="mb-4 text-gray-600">Use KasWare to interact with the platform</p>

			{#if !$isWalletInstalled}
				<div class="text-center">
					<p class="mb-4 text-sm text-red-600">KasWare wallet not installed</p>
					<a
						href="https://chromewebstore.google.com/detail/kasware-wallet/hklhheigdmpoolooomdihmhlpjjdbklf"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
					>
						Install KasWare
					</a>
				</div>
			{:else if $walletStore.isConnected}
				<div class="text-center">
					<p class="mb-2 text-sm text-green-600">Connected</p>
					<p class="mb-4 font-mono text-sm text-gray-700">{$shortAddress}</p>
					<button
						on:click={handleDisconnectWallet}
						disabled={$walletStore.isLoading}
						class="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
					>
						{$walletStore.isLoading ? 'Disconnecting...' : 'Disconnect'}
					</button>
				</div>
			{:else}
				<div class="text-center">
					<button
						on:click={handleConnectWallet}
						disabled={$walletStore.isLoading}
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{$walletStore.isLoading ? 'Connecting...' : 'Connect KasWare'}
					</button>
				</div>
			{/if}

			{#if $walletStore.error}
				<div class="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-700">{$walletStore.error}</p>
					<button
						on:click={() => walletActions.clearError()}
						class="mt-1 text-sm text-red-600 hover:text-red-800"
					>
						Dismiss
					</button>
				</div>
			{/if}
		</div>
	</div>

	<div class="rounded-lg bg-blue-50 p-8 text-center">
		<h2 class="mb-4 text-2xl font-bold text-gray-900">Ready to get started?</h2>
		<p class="mb-6 text-gray-600">Join our decentralized platform and share your knowledge</p>
		<div class="space-x-4">
			<a
				href="/create"
				class="inline-block rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
			>
				Write my first article
			</a>
			<a
				href="/articles"
				class="inline-block rounded-md border border-blue-600 bg-white px-6 py-3 text-blue-600 hover:bg-blue-50"
			>
				Explore articles
			</a>
		</div>
	</div>
</div>
