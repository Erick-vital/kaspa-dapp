<script lang="ts">
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

	let title = '';
	let content = '';
	let summary = '';
	let tags = '';
	let image = '';
	let isPublic = true;
	let savingDraft = false;
	let publishing = false;
	let activeTab = 'editor';

	function saveDraft() {
		savingDraft = true;
		setTimeout(() => {
			savingDraft = false;
			alert('Draft saved successfully');
		}, 1000);
	}

	function publishArticle() {
		if (!title || !content) {
			alert('Please complete at least the title and content');
			return;
		}

		publishing = true;
		setTimeout(() => {
			publishing = false;
			alert('Article published successfully');
		}, 1500);
	}

	function changeTab(tab: string) {
		activeTab = tab;
	}
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
						placeholder="Write an attractive title..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
						required
					/>
				</div>

				<div>
					<label for="summary" class="mb-2 block text-sm font-medium text-gray-700">
						Summary
					</label>
					<textarea
						id="summary"
						bind:value={summary}
						placeholder="Write a brief summary of the article..."
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
					></textarea>
				</div>

				<div>
					<label for="image" class="mb-2 block text-sm font-medium text-gray-700">
						Featured Image (URL)
					</label>
					<input
						id="image"
						type="url"
						bind:value={image}
						placeholder="https://example.com/image.jpg"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="tags" class="mb-2 block text-sm font-medium text-gray-700"> Tags </label>
					<input
						id="tags"
						type="text"
						bind:value={tags}
						placeholder="JavaScript, SvelteKit, Web (separated by commas)"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
					/>
					<p class="mt-1 text-sm text-gray-500">Separate tags with commas</p>
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
					<label for="content" class="mb-2 block text-sm font-medium text-gray-700">
						Content * (Markdown)
					</label>
					<textarea
						id="content"
						bind:value={content}
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
						class="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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

			<div class="flex items-center">
				<input
					id="public"
					type="checkbox"
					bind:checked={isPublic}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="public" class="ml-2 block text-sm text-gray-700">
					Make this article public
				</label>
			</div>
		</div>

		<div class="flex flex-col justify-end gap-4 sm:flex-row">
			<button
				type="button"
				on:click={saveDraft}
				disabled={savingDraft}
				class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
			>
				{savingDraft ? 'Saving...' : 'Save draft'}
			</button>

			<button
				type="button"
				on:click={publishArticle}
				disabled={publishing}
				class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
			>
				{publishing ? 'Publishing...' : 'Publish article'}
			</button>
		</div>
	</form>
</div>
