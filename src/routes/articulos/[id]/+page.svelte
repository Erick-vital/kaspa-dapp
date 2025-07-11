<script lang="ts">
	import { page } from '$app/stores';
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	
	const articulo = {
		id: 1,
		titulo: 'Introducción a SvelteKit',
		contenido: `# Introducción a SvelteKit

SvelteKit es un framework de aplicaciones web que utiliza **Svelte** como su framework de componentes. Proporciona un conjunto robusto de herramientas para crear aplicaciones web modernas y eficientes.

## ¿Qué es SvelteKit?

SvelteKit es la evolución natural de Svelte, diseñado específicamente para crear aplicaciones web de gran escala. Combina la simplicidad de Svelte con potentes capacidades de enrutamiento, renderizado del lado del servidor y optimización de construcción.

## Características principales

- **Enrutamiento basado en archivos:** Crea rutas automáticamente basadas en la estructura de archivos.
- **Renderizado del lado del servidor:** Mejora el rendimiento y SEO con SSR.
- **Generación estática:** Genera sitios estáticos para un rendimiento óptimo.
- **API endpoints:** Crea APIs directamente en tu aplicación.

## Primeros pasos

Para comenzar con SvelteKit, necesitas tener Node.js instalado. Luego puedes crear un nuevo proyecto con:

\`\`\`bash
npm create svelte@latest mi-app
cd mi-app
npm install
npm run dev
\`\`\`

¡Y listo! Tendrás una aplicación SvelteKit funcionando en segundos.

> **Nota:** Este es un ejemplo de artículo formateado con Markdown. En la versión final, el contenido se almacenará cifrado en el blockchain de Kaspa.`,
		autor: 'Juan Pérez',
		fecha: '2025-01-15',
		etiquetas: ['SvelteKit', 'JavaScript', 'Web'],
		imagen: '/api/placeholder/800/400',
		tiempoLectura: '5 min'
	};

	let contenidoHTML = '';

	onMount(() => {
		marked.setOptions({
			breaks: true,
			gfm: true
		});
		contenidoHTML = marked(articulo.contenido);
	});
</script>

<svelte:head>
	<title>{articulo.titulo} - Mi Blog</title>
	<meta name="description" content={articulo.titulo} />
</svelte:head>

<article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
	<div class="mb-8">
		<nav class="text-sm text-gray-500 mb-4">
			<a href="/" class="hover:text-gray-700">Inicio</a>
			<span class="mx-2">›</span>
			<a href="/articulos" class="hover:text-gray-700">Artículos</a>
			<span class="mx-2">›</span>
			<span class="text-gray-700">{articulo.titulo}</span>
		</nav>
		
		<header class="mb-8">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">{articulo.titulo}</h1>
			<div class="flex items-center gap-4 text-gray-600 mb-6">
				<span>Por {articulo.autor}</span>
				<span>•</span>
				<span>{articulo.fecha}</span>
				<span>•</span>
				<span>{articulo.tiempoLectura} de lectura</span>
			</div>
			<div class="flex flex-wrap gap-2 mb-6">
				{#each articulo.etiquetas as etiqueta}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
						{etiqueta}
					</span>
				{/each}
			</div>
		</header>
		
		<img 
			src={articulo.imagen} 
			alt={articulo.titulo}
			class="w-full h-64 md:h-96 object-cover rounded-lg mb-8"
		>
	</div>
	
	<div class="prose prose-lg max-w-none">
		{@html contenidoHTML}
	</div>
	
	<div class="mt-12 pt-8 border-t border-gray-200">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button class="flex items-center space-x-2 text-gray-600 hover:text-red-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
					</svg>
					<span>Me gusta</span>
				</button>
				<button class="flex items-center space-x-2 text-gray-600 hover:text-blue-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
					</svg>
					<span>Compartir</span>
				</button>
			</div>
			<div class="flex items-center space-x-2">
				<span class="text-sm text-gray-500">¿Te gustó este artículo?</span>
				<button class="text-blue-600 hover:text-blue-800 font-medium">Sígueme</button>
			</div>
		</div>
	</div>
	
	<div class="mt-12 bg-gray-50 rounded-lg p-6">
		<h3 class="text-lg font-semibold text-gray-900 mb-4">Sobre el autor</h3>
		<div class="flex items-start space-x-4">
			<img 
				src="/api/placeholder/60/60" 
				alt={articulo.autor}
				class="w-15 h-15 rounded-full"
			>
			<div>
				<h4 class="font-medium text-gray-900">{articulo.autor}</h4>
				<p class="text-gray-600 text-sm mt-1">
					Desarrollador web con más de 5 años de experiencia en JavaScript y frameworks modernos.
					Apasionado por crear aplicaciones web eficientes y escalables.
				</p>
			</div>
		</div>
	</div>
</article>