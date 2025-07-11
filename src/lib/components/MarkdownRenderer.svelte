<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	export let markdownContent: string;

	let htmlContent = '';

	onMount(() => {
		// Configurar marked con opciones recomendadas
		marked.setOptions({
			breaks: true,
			gfm: true,
			sanitize: false, // Mantener false para permitir HTML personalizado
			smartypants: true
		});
	});

	$: {
		if (markdownContent) {
			htmlContent = marked(markdownContent);
		}
	}
</script>

<div class="markdown-content">
	{@html htmlContent}
</div>
