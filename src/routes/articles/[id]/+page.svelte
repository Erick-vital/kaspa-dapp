<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import { articleService } from '$lib/services/article';
	import { walletStore } from '$lib/stores/wallet';
	import { authStore, authActions } from '$lib/stores/auth';
	import { cryptoService } from '$lib/services/crypto';
	import type { Article } from '$lib/types/article';

	let article: Article | null = null;
	let loading = true;
	let error = '';
	let articleId: string;
	let sharedKey: string | null = null;
	let needsAuth = false;
	let shareUrl = '';

	$: articleId = $page.params.id;
	$: sharedKey = $page.url.searchParams.get('key');

	// Generar share URL cuando tenemos un artículo público
	$: if (article && article.isPublic && typeof window !== 'undefined') {
		const baseUrl = window.location.origin + window.location.pathname;
		shareUrl = sharedKey ? `${baseUrl}?key=${sharedKey}` : baseUrl;
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function estimateReadingTime(content: string): string {
		const wordsPerMinute = 200;
		const words = content.split(/\s+/).length;
		const minutes = Math.ceil(words / wordsPerMinute);
		return `${minutes} min read`;
	}

	async function loadArticle() {
		try {
			loading = true;
			error = '';
			needsAuth = false;
			
			if (!articleId) {
				throw new Error('No article ID provided');
			}

			// Intentar cargar artículo público con shared key si está disponible
			if (sharedKey) {
				article = await loadPublicArticleWithSharedKey(articleId, sharedKey);
			} else {
				// Cargar artículo normal (puede ser público sin shared key o privado)
				article = await articleService.getArticleById(articleId);
				
				// Si el artículo es privado y no está autenticado, mostrar prompt de auth
				if (article && !article.isPublic && !$authStore.isAuthenticated) {
					needsAuth = true;
				}
			}
			
			if (!article) {
				throw new Error('Article not found');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load article';
			console.error('Error loading article:', err);
		} finally {
			loading = false;
		}
	}

	async function loadPublicArticleWithSharedKey(id: string, key: string): Promise<Article | null> {
		try {
			// Buscar el artículo encriptado en localStorage
			const stored = localStorage.getItem('articles');
			if (!stored) return null;
			
			const articles = JSON.parse(stored);
			const encryptedArticle = articles.find((a: any) => a.id === id);
			if (!encryptedArticle) return null;

			// Desencriptar usando la shared key
			const decryptedContent = await cryptoService.decrypt({
				encryptedData: encryptedArticle.encryptedData,
				nonce: encryptedArticle.nonce,
				key: key
			});

			const articleData = JSON.parse(decryptedContent);
			
			return {
				id: encryptedArticle.id,
				title: articleData.title,
				content: articleData.content,
				image: articleData.image,
				author: encryptedArticle.author,
				createdAt: encryptedArticle.createdAt,
				isPublic: true,
				txId: encryptedArticle.txId
			} as Article;
		} catch (err) {
			console.error('Error loading shared article:', err);
			throw new Error('Invalid shared link or article not accessible');
		}
	}

	async function handleAuthenticate() {
		try {
			await authActions.authenticate();
			// Recargar artículo después de autenticarse
			await loadArticle();
		} catch (err) {
			console.error('Authentication failed:', err);
		}
	}

	async function copyShareLink() {
		if (shareUrl) {
			try {
				await navigator.clipboard.writeText(shareUrl);
				alert('Share link copied to clipboard!');
			} catch (err) {
				console.error('Failed to copy share link:', err);
				alert('Failed to copy share link');
			}
		}
	}

	async function handleDelete(id: string) {
		if (article && confirm('Are you sure you want to delete this article?')) {
			try {
				const success = await articleService.deleteArticle(id);
				if (success) {
					goto('/articles');
				} else {
					alert('Failed to delete article');
				}
			} catch (err) {
				console.error('Error deleting article:', err);
				alert('Error deleting article');
			}
		}
	}

	onMount(() => {
		loadArticle();
	});

	// Reload article when ID changes
	$: if (articleId) {
		loadArticle();
	}
</script>

<svelte:head>
	<title>{article ? article.title : 'Loading...'} - Kaspa DApp</title>
	<meta name="description" content={article ? article.title : 'Loading article...'} />
</svelte:head>

{#if loading}
	<!-- Loading State -->
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		<div class="flex justify-center items-center py-12">
			<div class="text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p class="text-gray-600">Loading article...</p>
			</div>
		</div>
	</div>
{:else if needsAuth}
	<!-- Authentication Required -->
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		<div class="text-center py-12">
			<div class="max-w-md mx-auto">
				<div class="text-6xl mb-4">🔒</div>
				<h2 class="text-2xl font-bold text-gray-900 mb-2">Private Article</h2>
				<p class="text-gray-600 mb-6">This article is private and requires Kaspa wallet authentication to access.</p>
				<div class="flex flex-col gap-4">
					{#if !$walletStore.isConnected}
						<p class="text-sm text-orange-600 mb-2">Please connect your KasWare wallet first</p>
					{/if}
					<button
						on:click={handleAuthenticate}
						disabled={!$walletStore.isConnected || $authStore.isLoading}
						class="rounded-md bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{#if $authStore.isLoading}
							Authenticating...
						{:else}
							🔐 Authenticate with Kaspa
						{/if}
					</button>
					{#if $authStore.error}
						<p class="text-sm text-red-600">{$authStore.error}</p>
					{/if}
					<a 
						href="/articles" 
						class="text-gray-600 hover:text-gray-700 text-sm transition-colors"
					>
						← Back to Articles
					</a>
				</div>
			</div>
		</div>
	</div>
{:else if error}
	<!-- Error State -->
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		<div class="text-center py-12">
			<div class="max-w-sm mx-auto">
				<div class="text-6xl mb-4">❌</div>
				<h2 class="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h2>
				<p class="text-gray-600 mb-6">{error}</p>
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<button
						on:click={loadArticle}
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
					>
						Try Again
					</button>
					<a 
						href="/articles" 
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
					>
						← Back to Articles
					</a>
				</div>
			</div>
		</div>
	</div>
{:else if article}
	<!-- Article Content -->
	<article class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		<div class="mb-8">
			<!-- Breadcrumb Navigation -->
			<nav class="mb-6 text-sm text-gray-500">
				<a href="/" class="hover:text-gray-700">Home</a>
				<span class="mx-2">›</span>
				<a href="/articles" class="hover:text-gray-700">Articles</a>
				<span class="mx-2">›</span>
				<span class="text-gray-700">{article.title}</span>
			</nav>

			<!-- Article Header -->
			<header class="mb-8">
				<div class="flex items-start justify-between mb-4">
					<h1 class="text-4xl font-bold text-gray-900 flex-1 mr-4">{article.title}</h1>
					
					<!-- Actions -->
					<div class="flex gap-2">
						<!-- Share button for public articles -->
						{#if article.isPublic && shareUrl}
							<button
								on:click={copyShareLink}
								class="text-blue-600 hover:text-blue-700 p-2 rounded hover:bg-blue-50 transition-colors"
								title="Copy share link"
							>
								🔗
							</button>
						{/if}
						
						<!-- Delete button (only for author) -->
						{#if $walletStore.address === article.author}
							<button
								on:click={() => handleDelete(article!.id)}
								class="text-red-600 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
								title="Delete article"
							>
								🗑️
							</button>
						{/if}
					</div>
				</div>

				<!-- Article Metadata -->
				<div class="mb-6 flex flex-wrap items-center gap-4 text-gray-600">
					<div class="flex items-center gap-1">
						<span class="text-gray-400">👤</span>
						<span class="font-mono text-sm">
							{article.author.slice(0, 8)}...{article.author.slice(-6)}
						</span>
					</div>
					<span>•</span>
					<span>{formatDate(article.createdAt)}</span>
					<span>•</span>
					<span>{estimateReadingTime(article.content)}</span>
					<span>•</span>
					<div class="flex items-center gap-1">
						<span class="{article.isPublic ? 'text-green-600' : 'text-orange-600'}">
							{article.isPublic ? '🔓' : '🔒'}
						</span>
						<span class="{article.isPublic ? 'text-green-600' : 'text-orange-600'}">
							{article.isPublic ? 'Public' : 'Private'}
						</span>
						{#if !article.isPublic && article.price}
							<span class="text-orange-600">
								({(article.price / 100000000).toFixed(8)} KAS)
							</span>
						{/if}
					</div>
				</div>

				<!-- Content Size and Transaction Info -->
				<div class="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
					<div class="flex items-center gap-1">
						<span class="text-gray-400">📄</span>
						<span>{(new TextEncoder().encode(article.content).length / 1024).toFixed(1)}KB</span>
					</div>
					<span>•</span>
					<div class="flex items-center gap-1">
						<span class="text-gray-400">🔗</span>
						<span class="font-mono text-xs">{article.txId}</span>
					</div>
				</div>

				<!-- Shared Link Info for Public Articles -->
				{#if article.isPublic && sharedKey}
					<div class="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
						<div class="flex items-start gap-3">
							<span class="text-green-600 text-lg">🔗</span>
							<div class="flex-1">
								<h4 class="text-sm font-medium text-green-900 mb-1">Shared Article</h4>
								<p class="text-sm text-green-700">
									You're viewing this public article via a shared link. Anyone with this link can access the content.
								</p>
							</div>
						</div>
					</div>
				{/if}
			</header>

			<!-- Featured Image -->
			{#if article.image}
				<img
					src={article.image}
					alt={article.title}
					class="mb-8 h-64 w-full rounded-lg object-cover md:h-96"
				/>
			{/if}
		</div>

		<!-- Article Content -->
		<div class="prose prose-lg max-w-none">
			<MarkdownRenderer markdownContent={article.content} />
		</div>

		<!-- Article Footer -->
		<div class="mt-12 border-t border-gray-200 pt-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<span class="text-sm text-gray-500">Stored on Kaspa Network</span>
					<span class="text-sm text-gray-500">•</span>
					<span class="text-sm text-gray-500">Encrypted & Decentralized</span>
				</div>
				<a 
					href="/articles" 
					class="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
				>
					← Back to Articles
				</a>
			</div>
		</div>

		<!-- Author Info -->
		<div class="mt-12 rounded-lg bg-gray-50 p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">About the author</h3>
			<div class="flex items-start space-x-4">
				<div class="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
					{article.author.slice(6, 8).toUpperCase()}
				</div>
				<div>
					<h4 class="font-medium text-gray-900 font-mono text-sm">
						{article.author}
					</h4>
					<p class="mt-1 text-sm text-gray-600">
						Content creator on the Kaspa network. All articles are encrypted and stored 
						decentralized on the blockchain for permanent, censorship-resistant access.
					</p>
				</div>
			</div>
		</div>
	</article>
{/if}
