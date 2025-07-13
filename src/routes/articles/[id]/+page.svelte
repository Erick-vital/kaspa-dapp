<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import { articleService } from '$lib/services/article';
	import { urlShortener } from '$lib/services/urlShortener';
	import { walletStore } from '$lib/stores/wallet';
	import type { Article } from '$lib/types/article';

	let article: Article | null = null;
	let loading = true;
	let error = '';
	let articleId: string;
	let showShareModal = false;
	let fullUrl = '';
	let shortUrl = '';
	let generatingUrls = false;

	$: articleId = $page.params.id;

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
			
			if (!articleId) {
				throw new Error('No article ID provided');
			}

			// Obtener parámetros de la URL
			const sharedData = $page.url.searchParams.get('shared');
			const compressedData = $page.url.searchParams.get('c');
			const shortUrlKey = $page.url.searchParams.get('k');
			
			console.log('🔍 URL params:', { 
				articleId, 
				sharedData: sharedData ? 'present' : 'not found',
				compressedData: compressedData ? 'present' : 'not found',
				shortUrlKey: shortUrlKey ? 'present' : 'not found'
			});
			
			// Si es una URL corta (tiene clave 'k'), resolverla
			if (shortUrlKey) {
				console.log('🔗 Resolving short URL...');
				article = await urlShortener.resolveShortURL(articleId, shortUrlKey);
			} else {
				// Usar método tradicional
				article = await articleService.getArticleById(
					articleId, 
					sharedData || undefined, 
					compressedData || undefined
				);
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
		// Limpiar state del artículo anterior
		shortUrl = '';
		fullUrl = '';
		showShareModal = false;
		// Cargar nuevo artículo
		loadArticle();
	}

	async function handleShare() {
		if (!article || !article.isPublic) return;
		
		showShareModal = true;
		
		// Si ya tenemos URLs generadas, no generar nuevas
		if (shortUrl && fullUrl) {
			console.log('📤 Using cached URLs');
			return;
		}
		
		try {
			generatingUrls = true;
			
			// Generar ambas URLs
			const urls = await urlShortener.createShortURL(article);
			shortUrl = urls.shortUrl;
			fullUrl = urls.fullUrl;
			
			console.log('📤 Share URLs generated successfully');
		} catch (error) {
			console.error('Error generating share URLs:', error);
			alert('Error generating share URLs');
		} finally {
			generatingUrls = false;
		}
	}

	function copyToClipboard(text: string, type: 'short' | 'full') {
		navigator.clipboard.writeText(text).then(() => {
			const message = type === 'short' ? 'Short URL copied!' : 'Full URL copied!';
			alert(message);
		}).catch(() => {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = text;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			const message = type === 'short' ? 'Short URL copied!' : 'Full URL copied!';
			alert(message);
		});
	}

	function closeShareModal() {
		showShareModal = false;
		// No limpiar las URLs para mantenerlas en cache
		// fullUrl = '';
		// shortUrl = '';
	}

	async function regenerateUrls() {
		if (!article || !article.isPublic) return;
		
		// Forzar regeneración limpiando URLs existentes
		shortUrl = '';
		fullUrl = '';
		
		try {
			generatingUrls = true;
			
			// Generar nuevas URLs
			const urls = await urlShortener.createShortURL(article);
			shortUrl = urls.shortUrl;
			fullUrl = urls.fullUrl;
			
			console.log('🔄 URLs regenerated successfully');
		} catch (error) {
			console.error('Error regenerating URLs:', error);
			alert('Error regenerating URLs');
		} finally {
			generatingUrls = false;
		}
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
						onclick={loadArticle}
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
						{#if article.isPublic}
							<button
								onclick={handleShare}
								class="text-blue-600 hover:text-blue-700 p-2 rounded hover:bg-blue-50 transition-colors"
								title="Share article"
							>
								🔗
							</button>
						{/if}
						
						<!-- Delete button (only for connected author) -->
						{#if $walletStore.isConnected && $walletStore.address === article.author}
							<button
								onclick={() => handleDelete(article!.id)}
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

<!-- Share Modal -->
{#if showShareModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-lg font-semibold text-gray-900">Share Article</h3>
				<button
					onclick={closeShareModal}
					class="text-gray-400 hover:text-gray-600"
				>
					✕
				</button>
			</div>

			{#if generatingUrls}
				<div class="text-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p class="text-gray-600">Generating share URLs...</p>
				</div>
			{:else}
				<div class="space-y-6">
					<!-- Short URL -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Short URL (recommended)
						</label>
						<p class="text-xs text-gray-500 mb-2">
							Easy to share, works for 30 days
						</p>
						<div class="flex gap-2">
							<input
								type="text"
								value={shortUrl}
								readonly
								class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
							/>
							<button
								onclick={() => copyToClipboard(shortUrl, 'short')}
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
							>
								Copy
							</button>
						</div>
					</div>

					<!-- Full URL -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Full URL (censorship resistant)
						</label>
						<p class="text-xs text-gray-500 mb-2">
							Contains complete article data, works forever, longer URL
						</p>
						<div class="flex gap-2">
							<textarea
								value={fullUrl}
								readonly
								rows="3"
								class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono resize-none"
							></textarea>
							<button
								onclick={() => copyToClipboard(fullUrl, 'full')}
								class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
							>
								Copy
							</button>
						</div>
					</div>
				</div>

				<div class="mt-6 flex justify-between">
					<button
						onclick={regenerateUrls}
						class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
						disabled={generatingUrls}
					>
						{generatingUrls ? 'Generating...' : 'Regenerate URLs'}
					</button>
					<button
						onclick={closeShareModal}
						class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
					>
						Close
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
