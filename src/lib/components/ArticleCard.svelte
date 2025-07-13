<script lang="ts">
	import type { Article } from '../types/article';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import { urlShortener } from '../services/urlShortener';

	export let article: Article;
	export let showPreview = true;
	export let onDelete: ((id: string) => void) | null = null;

	let articleUrl: string = `/articles/${article.id}`;

	// Generar URL al cargar el componente
	$: if (article.isPublic) {
		urlShortener.createShortURL(article).then(({ shortUrl }) => {
			articleUrl = shortUrl;
		}).catch(error => {
			console.warn('Failed to generate short URL:', error);
			articleUrl = `/articles/${article.id}`;
		});
	} else {
		articleUrl = `/articles/${article.id}`;
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getPreview(content: string): string {
		// Remove markdown formatting and get first 150 characters
		const plainText = content
			.replace(/#{1,6}\s+/g, '') // Remove headers
			.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
			.replace(/\*(.*?)\*/g, '$1') // Remove italic
			.replace(/`(.*?)`/g, '$1') // Remove inline code
			.replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
			.replace(/```[\s\S]*?```/g, '[Code Block]') // Replace code blocks
			.replace(/\n+/g, ' ') // Replace newlines with spaces
			.trim();
		
		return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
	}

	async function handleDelete() {
		if (onDelete && confirm('Are you sure you want to delete this article?')) {
			onDelete(article.id);
		}
	}
</script>

<div class="rounded-lg bg-white p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
	<!-- Header -->
	<div class="mb-4">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-gray-900 mb-2">
					<a href={articleUrl} class="hover:text-blue-600 transition-colors">
						{article.title}
					</a>
				</h3>
				
				<div class="flex items-center gap-4 text-sm text-gray-500 mb-3">
					<div class="flex items-center gap-1">
						<span class="text-gray-400">👤</span>
						<span class="font-mono text-xs">
							{article.author.slice(0, 8)}...{article.author.slice(-6)}
						</span>
					</div>
					
					<div class="flex items-center gap-1">
						<span class="text-gray-400">📅</span>
						<span>{formatDate(article.createdAt)}</span>
					</div>
					
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
			</div>

			<!-- Actions -->
			{#if onDelete}
				<div class="flex gap-2">
					<button
						on:click={handleDelete}
						class="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
						title="Delete article"
					>
						🗑️
					</button>
				</div>
			{/if}
		</div>

		<!-- Featured Image -->
		{#if article.image}
			<div class="mb-3">
				<img 
					src={article.image} 
					alt={article.title}
					class="w-full h-48 object-cover rounded-md"
					loading="lazy"
				/>
			</div>
		{/if}
	</div>

	<!-- Content Preview -->
	{#if showPreview}
		<div class="prose prose-sm max-w-none text-gray-600 mb-4">
			{getPreview(article.content)}
		</div>
	{:else}
		<!-- Full Content -->
		<div class="prose max-w-none">
			<MarkdownRenderer markdownContent={article.content} />
		</div>
	{/if}

	<!-- Footer -->
	<div class="flex items-center justify-between pt-4 border-t border-gray-100">
		<div class="flex items-center gap-4 text-sm text-gray-500">
			<div class="flex items-center gap-1">
				<span class="text-gray-400">📄</span>
				<span>{(new TextEncoder().encode(article.content).length / 1024).toFixed(1)}KB</span>
			</div>
			
			<div class="flex items-center gap-1">
				<span class="text-gray-400">🔗</span>
				<span class="font-mono text-xs">{article.txId.slice(0, 12)}...</span>
			</div>
		</div>

		{#if showPreview}
			<a 
				href={articleUrl} 
				class="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
			>
				Read More →
			</a>
		{/if}
	</div>
</div>