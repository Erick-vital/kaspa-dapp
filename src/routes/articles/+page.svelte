<script lang="ts">
	import { onMount } from 'svelte';
	import { articleService } from '$lib/services/article';
	import { walletStore } from '$lib/stores/wallet';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import type { Article } from '$lib/types/article';

	let articles: Article[] = [];
	let filteredArticles: Article[] = [];
	let loading = true;
	let error = '';
	let searchQuery = '';
	let selectedFilter = 'all';

	// Reactive loading when wallet connection changes
	$: if ($walletStore.isConnected !== undefined) {
		loadArticles();
	}

	// Reactive filtering
	$: {
		if (searchQuery || selectedFilter !== 'all') {
			filteredArticles = articles.filter(article => {
				const matchesSearch = searchQuery === '' || 
					article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					article.content.toLowerCase().includes(searchQuery.toLowerCase());

				const matchesFilter = selectedFilter === 'all' ||
					(selectedFilter === 'public' && article.isPublic) ||
					(selectedFilter === 'private' && !article.isPublic) ||
					(selectedFilter === 'my-articles' && article.author === $walletStore.address);

				return matchesSearch && matchesFilter;
			});
		} else {
			filteredArticles = articles;
		}
	}

	async function loadArticles() {
		try {
			loading = true;
			error = '';
			articles = await articleService.getDecryptedArticles();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load articles';
			console.error('Error loading articles:', err);
		} finally {
			loading = false;
		}
	}

	async function handleDelete(articleId: string) {
		try {
			const success = await articleService.deleteArticle(articleId);
			if (success) {
				await loadArticles(); // Reload articles
			} else {
				alert('Failed to delete article');
			}
		} catch (err) {
			console.error('Error deleting article:', err);
			alert('Error deleting article');
		}
	}

	onMount(() => {
		loadArticles();
	});
</script>

<svelte:head>
	<title>Articles - Kaspa DApp</title>
</svelte:head>

<div class="px-4 sm:px-6 lg:px-8">
	<div class="mb-8">
		<div class="flex items-center justify-between mb-4">
			<h1 class="text-3xl font-bold text-gray-900">My Articles</h1>
			<a 
				href="/create" 
				class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
			>
				+ New Article
			</a>
		</div>

		<!-- Search and Filters -->
		<div class="mb-6 flex flex-col gap-4 sm:flex-row">
			<input
				type="text"
				placeholder="Search articles..."
				bind:value={searchQuery}
				class="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
			/>
			<select
				bind:value={selectedFilter}
				class="rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
			>
				<option value="all">All Articles</option>
				<option value="public">Public Only</option>
				<option value="private">Private Only</option>
				{#if $walletStore.address}
					<option value="my-articles">My Articles</option>
				{/if}
			</select>
			<button
				on:click={loadArticles}
				class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 transition-colors"
				disabled={loading}
			>
				{loading ? '🔄' : '🔄'} Refresh
			</button>
		</div>

		<!-- Wallet Status -->
		{#if !$walletStore.isConnected}
			<div class="rounded-lg bg-yellow-50 border border-yellow-200 p-4 mb-6">
				<div class="flex items-center">
					<div class="h-2 w-2 rounded-full bg-yellow-400 mr-2"></div>
					<span class="text-sm text-yellow-700">
						Connect your KasWare wallet to see and manage your articles
					</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p class="text-gray-600">Loading articles...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
			<p class="text-red-700 mb-4">❌ {error}</p>
			<button
				on:click={loadArticles}
				class="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if filteredArticles.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			{#if articles.length === 0}
				<div class="max-w-sm mx-auto">
					<div class="text-6xl mb-4">📝</div>
					<h3 class="text-xl font-medium text-gray-900 mb-2">No articles yet</h3>
					<p class="text-gray-600 mb-6">Start by creating your first encrypted article on the Kaspa network.</p>
					<a 
						href="/create" 
						class="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors"
					>
						Create Your First Article
					</a>
				</div>
			{:else}
				<div class="max-w-sm mx-auto">
					<div class="text-4xl mb-4">🔍</div>
					<h3 class="text-xl font-medium text-gray-900 mb-2">No articles found</h3>
					<p class="text-gray-600">Try adjusting your search or filter criteria.</p>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Articles Grid -->
		<div class="space-y-6">
			{#each filteredArticles as article (article.id)}
				<ArticleCard 
					{article} 
					showPreview={true}
					onDelete={$walletStore.address === article.author ? handleDelete : null}
				/>
			{/each}
		</div>

		<!-- Results Summary -->
		<div class="mt-8 text-center text-sm text-gray-500">
			Showing {filteredArticles.length} of {articles.length} articles
		</div>
	{/if}
</div>
