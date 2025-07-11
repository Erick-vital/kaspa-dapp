<script lang="ts">
	import { page } from '$app/stores';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	
	const article = {
		id: 1,
		title: 'Introduction to SvelteKit',
		content: `# Introduction to SvelteKit

SvelteKit is a web application framework that uses **Svelte** as its component framework. It provides a robust set of tools for creating modern and efficient web applications.

## What is SvelteKit?

SvelteKit is the natural evolution of Svelte, designed specifically for creating large-scale web applications. It combines the simplicity of Svelte with powerful routing capabilities, server-side rendering, and build optimization.

## Key Features

- **File-based routing:** Creates routes automatically based on file structure.
- **Server-side rendering:** Improves performance and SEO with SSR.
- **Static generation:** Generates static sites for optimal performance.
- **API endpoints:** Create APIs directly in your application.

## Getting Started

To start with SvelteKit, you need to have Node.js installed. Then you can create a new project with:

\`\`\`bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
\`\`\`

And that's it! You'll have a SvelteKit application running in seconds.

> **Note:** This is an example article formatted with Markdown. In the final version, content will be stored encrypted on the Kaspa blockchain.`,
		author: 'John Pérez',
		date: '2025-01-15',
		tags: ['SvelteKit', 'JavaScript', 'Web'],
		image: '/api/placeholder/800/400',
		readingTime: '5 min'
	};
</script>

<svelte:head>
	<title>{article.title} - My Blog</title>
	<meta name="description" content={article.title} />
</svelte:head>

<article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
	<div class="mb-8">
		<nav class="text-sm text-gray-500 mb-4">
			<a href="/" class="hover:text-gray-700">Home</a>
			<span class="mx-2">›</span>
			<a href="/articles" class="hover:text-gray-700">Articles</a>
			<span class="mx-2">›</span>
			<span class="text-gray-700">{article.title}</span>
		</nav>
		
		<header class="mb-8">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>
			<div class="flex items-center gap-4 text-gray-600 mb-6">
				<span>By {article.author}</span>
				<span>•</span>
				<span>{article.date}</span>
				<span>•</span>
				<span>{article.readingTime} read</span>
			</div>
			<div class="flex flex-wrap gap-2 mb-6">
				{#each article.tags as tag}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
						{tag}
					</span>
				{/each}
			</div>
		</header>
		
		<img 
			src={article.image} 
			alt={article.title}
			class="w-full h-64 md:h-96 object-cover rounded-lg mb-8"
		>
	</div>
	
	<MarkdownRenderer markdownContent={article.content} />
	
	<div class="mt-12 pt-8 border-t border-gray-200">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button class="flex items-center space-x-2 text-gray-600 hover:text-red-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
					</svg>
					<span>Like</span>
				</button>
				<button class="flex items-center space-x-2 text-gray-600 hover:text-blue-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
					</svg>
					<span>Share</span>
				</button>
			</div>
			<div class="flex items-center space-x-2">
				<span class="text-sm text-gray-500">Did you like this article?</span>
				<button class="text-blue-600 hover:text-blue-800 font-medium">Follow me</button>
			</div>
		</div>
	</div>
	
	<div class="mt-12 bg-gray-50 rounded-lg p-6">
		<h3 class="text-lg font-semibold text-gray-900 mb-4">About the author</h3>
		<div class="flex items-start space-x-4">
			<img 
				src="/api/placeholder/60/60" 
				alt={article.author}
				class="w-15 h-15 rounded-full"
			>
			<div>
				<h4 class="font-medium text-gray-900">{article.author}</h4>
				<p class="text-gray-600 text-sm mt-1">
					Web developer with over 5 years of experience in JavaScript and modern frameworks.
					Passionate about creating efficient and scalable web applications.
				</p>
			</div>
		</div>
	</div>
</article>