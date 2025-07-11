<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	export let markdownContent: string;

	let htmlContent = '';

	onMount(() => {
		// Configurar marked con opciones recomendadas
		marked.setOptions({
			breaks: true,
			gfm: true
		});
	});

	$: {
		if (markdownContent) {
			const result = marked(markdownContent);
			if (typeof result === 'string') {
				htmlContent = result;
			} else {
				result.then((html) => {
					htmlContent = html;
				});
			}
		}
	}
</script>

<div class="markdown-content">
	{@html htmlContent}
</div>
