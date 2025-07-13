<script lang="ts">
	import { walletStore } from '$lib/stores/wallet';
	import { articleService } from '$lib/services/article';

	let showDebug = false;
	let debugInfo = '';

	async function getDebugInfo() {
		const storedArticles = articleService.getStoredArticles();
		const storedKeys = articleService.getStoredKeys();
		const stats = articleService.getArticleStats();
		
		const signatures = JSON.parse(localStorage.getItem('articleSignatures') || '{}');
		const transactions = JSON.parse(localStorage.getItem('articleTransactions') || '{}');

		debugInfo = `
=== WALLET INFO ===
Connected: ${$walletStore.isConnected}
Address: ${$walletStore.address || 'None'}

=== ARTICLE STATISTICS ===
Total Articles: ${stats.totalArticles}
Articles with Keys: ${stats.articlesWithKeys}
Articles without Keys: ${stats.articlesWithoutKeys}
Public Articles: ${stats.publicArticles}
Private Articles: ${stats.privateArticles}
Total Keys: ${stats.totalKeys}
Total Signatures: ${stats.totalSignatures}
Total Transactions: ${stats.totalTransactions}

=== STORED ARTICLES (${storedArticles.length}) ===
${storedArticles.map(article => `
ID: ${article.id}
Author: ${article.metadata.author}
Title: ${article.metadata.title}
Public: ${article.metadata.isPublic}
TxID: ${article.txId}
Has Key: ${storedKeys.some(k => k.articleId === article.id) ? 'Yes' : 'No'}
`).join('\n')}

=== STORED KEYS (${storedKeys.length}) ===
${storedKeys.map(key => `
Article ID: ${key.articleId}
Is Public: ${key.isPublic}
`).join('\n')}

=== SIGNATURES (${Object.keys(signatures).length}) ===
${Object.entries(signatures).map(([id, data]: [string, any]) => `
Article ID: ${id}
Timestamp: ${new Date(data.timestamp).toLocaleString()}
`).join('\n')}

=== TRANSACTIONS (${Object.keys(transactions).length}) ===
${Object.entries(transactions).map(([id, data]: [string, any]) => `
Article ID: ${id}
TxID: ${data.txId}
Timestamp: ${new Date(data.timestamp).toLocaleString()}
`).join('\n')}
		`.trim();
	}

	async function recoverKeys() {
		try {
			const recovered = await articleService.recoverMissingKeys();
			alert(`Recovery completed! Recovered ${recovered} keys.`);
			getDebugInfo();
		} catch (error) {
			alert(`Recovery failed: ${error}`);
		}
	}

	function clearAllData() {
		if (confirm('Are you sure you want to clear all stored data? This cannot be undone.')) {
			localStorage.removeItem('articles');
			localStorage.removeItem('articleKeys');
			localStorage.removeItem('articleSignatures');
			localStorage.removeItem('articleTransactions');
			alert('All data cleared');
			getDebugInfo();
		}
	}

	function exportData() {
		const data = {
			articles: articleService.getStoredArticles(),
			keys: articleService.getStoredKeys(),
			signatures: JSON.parse(localStorage.getItem('articleSignatures') || '{}'),
			transactions: JSON.parse(localStorage.getItem('articleTransactions') || '{}'),
			timestamp: Date.now(),
			walletAddress: $walletStore.address
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `kaspa-articles-backup-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

{#if showDebug}
	<div class="fixed bottom-4 right-4 max-w-md bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-sm font-medium text-gray-900">🐛 Debug Panel</h3>
			<button 
				on:click={() => showDebug = false}
				class="text-gray-400 hover:text-gray-600"
			>
				✕
			</button>
		</div>

		<div class="space-y-2 mb-3">
			<button
				on:click={getDebugInfo}
				class="w-full text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
			>
				🔍 Refresh Debug Info
			</button>
			
			<button
				on:click={recoverKeys}
				class="w-full text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100"
			>
				🔧 Recover Missing Keys
			</button>
			
			<button
				on:click={exportData}
				class="w-full text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
			>
				💾 Export Data
			</button>
			
			<button
				on:click={clearAllData}
				class="w-full text-xs bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100"
			>
				🗑️ Clear All Data
			</button>
		</div>

		{#if debugInfo}
			<pre class="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">{debugInfo}</pre>
		{/if}
	</div>
{/if}

<button
	on:click={() => showDebug = !showDebug}
	class="fixed bottom-4 right-4 w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center text-lg hover:bg-gray-700 z-40"
	title="Debug Panel"
>
	🐛
</button>