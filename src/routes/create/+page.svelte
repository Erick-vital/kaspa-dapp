<script lang="ts">
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import { articleService } from '$lib/services/article';
	import { walletStore } from '$lib/stores/wallet';
	import type { CreateArticleRequest } from '$lib/types/article';

	let title = '';
	let content = '';
	let image = '';
	let isPublic = true;
	let price = 0;
	let savingDraft = false;
	let publishing = false;
	let activeTab = 'editor';
	let publishResult = '';
	let publishError = '';

	// Reactive variables for content size calculation
	$: contentSize = content ? new TextEncoder().encode(content).length : 0;
	$: maxSize = 10 * 1024; // 10KB
	$: isOverLimit = contentSize > maxSize;
	$: sizePercentage = maxSize > 0 ? Math.min((contentSize / maxSize) * 100, 100) : 0;
	$: contentSizeKB = contentSize / 1024;
	
	// Debug reactive update
	$: if (typeof window !== 'undefined') {
		console.log('Content size updated:', { 
			contentLength: content.length, 
			contentSize, 
			contentSizeKB: contentSizeKB.toFixed(1) 
		});
	}

	function saveDraft() {
		savingDraft = true;
		try {
			const draft = {
				title,
				content,
				image,
				isPublic,
				price,
				savedAt: Date.now()
			};
			localStorage.setItem('articleDraft', JSON.stringify(draft));
			publishResult = 'Draft saved successfully';
			publishError = '';
		} catch (error) {
			publishError = 'Failed to save draft';
			publishResult = '';
		} finally {
			savingDraft = false;
		}
	}

	function loadDraft() {
		try {
			const stored = localStorage.getItem('articleDraft');
			if (stored) {
				const draft = JSON.parse(stored);
				title = draft.title || '';
				content = draft.content || '';
				image = draft.image || '';
				isPublic = draft.isPublic !== undefined ? draft.isPublic : true;
				price = draft.price || 0;
				publishResult = 'Draft loaded';
				publishError = '';
			}
		} catch (error) {
			publishError = 'Failed to load draft';
		}
	}

	async function publishArticle() {
		if (!title || !content) {
			publishError = 'Please complete at least the title and content';
			publishResult = '';
			return;
		}

		if (isOverLimit) {
			publishError = `Content too large: ${contentSizeKB.toFixed(1)}KB (max: 10KB)`;
			publishResult = '';
			return;
		}

		if (!isPublic && (!price || price <= 0)) {
			publishError = 'Private articles must have a price greater than 0';
			publishResult = '';
			return;
		}

		publishing = true;
		publishError = '';
		publishResult = '';

		try {
			const request: CreateArticleRequest = {
				title,
				content,
				tags: [], // Simplified - no tags for now
				image: image || undefined,
				isPublic,
				price: isPublic ? undefined : price * 100000000 // convertir KAS a sompi
			};

			const result = await articleService.publishArticle(request);

			if (result.success) {
				publishResult = `Article published successfully! Transaction ID: ${result.txId}`;
				// Limpiar formulario después de publicar exitosamente
				title = '';
				content = '';
				image = '';
				isPublic = true;
				price = 0;
				// Limpiar draft guardado
				localStorage.removeItem('articleDraft');
			} else {
				publishError = result.error || 'Unknown error occurred';
			}
		} catch (error) {
			publishError = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			publishing = false;
		}
	}

	function changeTab(tab: string) {
		activeTab = tab;
	}

	function clearMessages() {
		publishResult = '';
		publishError = '';
	}

	// Cargar draft al montar el componente
	import { onMount } from 'svelte';
	onMount(() => {
		loadDraft();
	});
</script>

<svelte:head>
	<title>Create Article - My Blog</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">Create New Article</h1>
		<p class="text-gray-600">Share your ideas and knowledge with the community</p>
	</div>

	<form class="space-y-6">
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-medium text-gray-900">Basic Information</h2>

			<div class="grid grid-cols-1 gap-6">
				<div>
					<label for="title" class="mb-2 block text-sm font-medium text-gray-700">
						Article Title *
					</label>
					<input
						id="title"
						type="text"
						bind:value={title}
						on:input={clearMessages}
						placeholder="Write an attractive title..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
						required
					/>
				</div>

				<div>
					<label for="image" class="mb-2 block text-sm font-medium text-gray-700">
						Featured Image (URL)
					</label>
					<input
						id="image"
						type="url"
						bind:value={image}
						on:input={clearMessages}
						placeholder="https://example.com/image.jpg"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-medium text-gray-900">Article Content</h2>

			<div class="mb-4">
				<div class="flex border-b border-gray-200">
					<button
						type="button"
						on:click={() => changeTab('editor')}
						class="px-4 py-2 text-sm font-medium {activeTab === 'editor'
							? 'border-b-2 border-blue-600 text-blue-600'
							: 'text-gray-500 hover:text-gray-700'}"
					>
						Editor
					</button>
					<button
						type="button"
						on:click={() => changeTab('preview')}
						class="px-4 py-2 text-sm font-medium {activeTab === 'preview'
							? 'border-b-2 border-blue-600 text-blue-600'
							: 'text-gray-500 hover:text-gray-700'}"
					>
						Preview
					</button>
					<button
						type="button"
						on:click={() => changeTab('help')}
						class="px-4 py-2 text-sm font-medium {activeTab === 'help'
							? 'border-b-2 border-blue-600 text-blue-600'
							: 'text-gray-500 hover:text-gray-700'}"
					>
						Markdown Help
					</button>
				</div>
			</div>

			{#if activeTab === 'editor'}
				<div>
					<div class="flex items-center justify-between mb-2">
						<label for="content" class="block text-sm font-medium text-gray-700">
							Content * (Markdown)
						</label>
						<div class="text-sm">
							<span class:text-red-600={isOverLimit} class:text-gray-500={!isOverLimit}>
								{contentSizeKB.toFixed(1)}KB / 10KB
							</span>
							{#if isOverLimit}
								<span class="text-red-600 ml-1">⚠️ Over limit</span>
							{/if}
						</div>
					</div>
					
					<!-- Progress bar -->
					<div class="mb-3 bg-gray-200 rounded-full h-2 overflow-hidden">
						<div 
							class="h-full transition-all duration-300 {isOverLimit ? 'bg-red-500' : sizePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}"
							style="width: {sizePercentage}%"
						></div>
					</div>

					<textarea
						id="content"
						bind:value={content}
						on:input={clearMessages}
						placeholder="# My Article

Write content using **Markdown**...

## Section 1
- List of elements
- Another element

```javascript
// Example code
console.log('Hello world');
```"
						rows="20"
						class="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 {isOverLimit ? 'border-red-300 focus:border-red-500' : ''}"
						required
					></textarea>
					<p class="mt-1 text-sm text-gray-500">
						Use Markdown to format your content. Check the "Markdown Help" tab for more information.
					</p>
				</div>
			{/if}

			{#if activeTab === 'preview'}
				<div>
					<h3 class="mb-2 text-sm font-medium text-gray-700">Preview</h3>
					<div class="min-h-[400px] rounded-md border border-gray-300 bg-gray-50 p-4">
						{#if content}
							<MarkdownRenderer markdownContent={content} />
						{:else}
							<p class="text-gray-500 italic">
								Write content in the editor to see the preview here...
							</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if activeTab === 'help'}
				<div>
					<h3 class="mb-4 text-sm font-medium text-gray-700">Markdown Guide</h3>
					<div class="space-y-4 text-sm">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<h4 class="mb-2 font-medium text-gray-900">Basic Text</h4>
								<div class="rounded bg-gray-50 p-3 font-mono text-xs">
									**Bold**<br />
									*Italic*<br />
									~~Strikethrough~~<br />
									`Inline code`
								</div>
							</div>
							<div>
								<h4 class="mb-2 font-medium text-gray-900">Headings</h4>
								<div class="rounded bg-gray-50 p-3 font-mono text-xs">
									# Heading 1<br />
									## Heading 2<br />
									### Heading 3<br />
									#### Heading 4
								</div>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<h4 class="mb-2 font-medium text-gray-900">Lists</h4>
								<div class="rounded bg-gray-50 p-3 font-mono text-xs">
									- Element 1<br />
									- Element 2<br />
									&nbsp;&nbsp;- Sub-element<br /><br />
									1. Numbered 1<br />
									2. Numbered 2
								</div>
							</div>
							<div>
								<h4 class="mb-2 font-medium text-gray-900">Links and Images</h4>
								<div class="rounded bg-gray-50 p-3 font-mono text-xs">
									[Link](https://example.com)<br />
									![Image](image-url.jpg)<br />
									![Alt text](image.jpg "Title")
								</div>
							</div>
						</div>

						<div>
							<h4 class="mb-2 font-medium text-gray-900">Code</h4>
							<div class="rounded bg-gray-50 p-3 font-mono text-xs">
								```javascript<br />
								function example() {'{'}<br />
								&nbsp;&nbsp;console.log("Hello world");<br />
								{'}'}<br />
								```
							</div>
						</div>

						<div>
							<h4 class="mb-2 font-medium text-gray-900">Quotes</h4>
							<div class="rounded bg-gray-50 p-3 font-mono text-xs">
								> This is a quote<br />
								> that can have multiple lines
							</div>
						</div>

						<div>
							<h4 class="mb-2 font-medium text-gray-900">Lines and Separators</h4>
							<div class="rounded bg-gray-50 p-3 font-mono text-xs">
								---<br />
								(horizontal line)
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-medium text-gray-900">Configuration</h2>

			<div class="space-y-4">
				<div class="flex items-center">
					<input
						id="public"
						type="checkbox"
						bind:checked={isPublic}
						on:change={clearMessages}
						class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<label for="public" class="ml-2 block text-sm text-gray-700">
						Make this article public
					</label>
				</div>

				{#if !isPublic}
					<div>
						<label for="price" class="mb-2 block text-sm font-medium text-gray-700">
							Price (KAS) *
						</label>
						<input
							id="price"
							type="number"
							min="0.00000001"
							step="0.00000001"
							bind:value={price}
							on:input={clearMessages}
							placeholder="0.1"
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
							required={!isPublic}
						/>
						<p class="mt-1 text-sm text-gray-500">
							Readers will need to pay this amount in KAS to access the article
						</p>
					</div>
				{/if}

				<div class="rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-200">
					<h3 class="text-sm font-medium text-blue-900 mb-3 flex items-center">
						🌐 Decentralized Publishing
					</h3>
					<div class="space-y-3 text-sm">
						<div class="flex items-start space-x-2">
							<span class="text-blue-600">📝</span>
							<div>
								<span class="text-blue-800 font-medium">Your article will be stored on the Kaspa network</span>
								<p class="text-blue-600">Permanently available, censorship-resistant, and decentralized</p>
							</div>
						</div>
						
						{#if $walletStore.address}
							<div class="flex items-start space-x-2">
								<span class="text-green-600">👤</span>
								<div>
									<span class="text-blue-800 font-medium">Author</span>
									<p class="text-blue-600 font-mono text-xs break-all">{$walletStore.address}</p>
								</div>
							</div>
						{/if}

						<div class="flex items-start space-x-2">
							<span class="{isPublic ? 'text-green-600' : 'text-orange-600'}">
								{isPublic ? '🔓' : '🔒'}
							</span>
							<div>
								<span class="text-blue-800 font-medium">
									{isPublic ? 'Public Article' : 'Private Article'}
								</span>
								<p class="text-blue-600">
									{isPublic 
										? 'Anyone can read this article for free' 
										: `Readers pay ${price || 0} KAS to unlock`
									}
								</p>
							</div>
						</div>

						<div class="flex items-start space-x-2">
							<span class="{isOverLimit ? 'text-red-600' : 'text-blue-600'}">📊</span>
							<div>
								<span class="text-blue-800 font-medium">Content Size</span>
								<p class="{isOverLimit ? 'text-red-600' : 'text-blue-600'}">
									{contentSizeKB.toFixed(1)}KB used of 10KB limit
									{#if isOverLimit}(Over limit!)
									{:else if sizePercentage > 80}(Almost full)
									{:else}(Good){/if}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Wallet Connection Status -->
		{#if $walletStore.isConnected}
			<div class="rounded-lg bg-green-50 p-4">
				<div class="flex items-center">
					<div class="h-2 w-2 rounded-full bg-green-400 mr-2"></div>
					<span class="text-sm text-green-700">
						Connected to wallet: {$walletStore.address?.slice(0, 8)}...{$walletStore.address?.slice(-8)}
					</span>
				</div>
			</div>
		{:else}
			<div class="rounded-lg bg-yellow-50 p-4">
				<div class="flex items-center">
					<div class="h-2 w-2 rounded-full bg-yellow-400 mr-2"></div>
					<span class="text-sm text-yellow-700">
						Please connect your KasWare wallet to publish articles
					</span>
				</div>
			</div>
		{/if}

		<!-- Messages -->
		{#if publishResult}
			<div class="rounded-lg bg-green-50 border border-green-200 p-4">
				<p class="text-sm text-green-700">{publishResult}</p>
			</div>
		{/if}

		{#if publishError}
			<div class="rounded-lg bg-red-50 border border-red-200 p-4">
				<p class="text-sm text-red-700">{publishError}</p>
			</div>
		{/if}

		<div class="flex flex-col justify-end gap-4 sm:flex-row">
			<button
				type="button"
				on:click={loadDraft}
				class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
			>
				Load Draft
			</button>

			<button
				type="button"
				on:click={saveDraft}
				disabled={savingDraft}
				class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
			>
				{savingDraft ? 'Saving...' : 'Save Draft'}
			</button>

			<button
				type="button"
				on:click={publishArticle}
				disabled={publishing || !$walletStore.isConnected}
				class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{publishing ? 'Publishing to Kaspa...' : 'Publish Article'}
			</button>
		</div>
	</form>
</div>
