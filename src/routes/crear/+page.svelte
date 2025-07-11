<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	let titulo = '';
	let contenido = '';
	let resumen = '';
	let etiquetas = '';
	let imagen = '';
	let esPublico = true;
	let guardandoBorrador = false;
	let publicando = false;
	let activeTab = 'editor';
	let markdownPreview = '';

	onMount(() => {
		marked.setOptions({
			breaks: true,
			gfm: true
		});
	});

	$: {
		if (contenido) {
			markdownPreview = marked(contenido);
		}
	}

	function guardarBorrador() {
		guardandoBorrador = true;
		setTimeout(() => {
			guardandoBorrador = false;
			alert('Borrador guardado exitosamente');
		}, 1000);
	}

	function publicarArticulo() {
		if (!titulo || !contenido) {
			alert('Por favor completa al menos el título y el contenido');
			return;
		}
		
		publicando = true;
		setTimeout(() => {
			publicando = false;
			alert('Artículo publicado exitosamente');
		}, 1500);
	}

	function cambiarTab(tab: string) {
		activeTab = tab;
	}
</script>

<svelte:head>
	<title>Crear Artículo - Mi Blog</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Crear Nuevo Artículo</h1>
		<p class="text-gray-600">Comparte tus ideas y conocimientos con la comunidad</p>
	</div>

	<form class="space-y-6">
		<div class="bg-white shadow-sm rounded-lg p-6">
			<h2 class="text-lg font-medium text-gray-900 mb-4">Información básica</h2>
			
			<div class="grid grid-cols-1 gap-6">
				<div>
					<label for="titulo" class="block text-sm font-medium text-gray-700 mb-2">
						Título del artículo *
					</label>
					<input
						id="titulo"
						type="text"
						bind:value={titulo}
						placeholder="Escribe un título atractivo..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						required
					>
				</div>

				<div>
					<label for="resumen" class="block text-sm font-medium text-gray-700 mb-2">
						Resumen
					</label>
					<textarea
						id="resumen"
						bind:value={resumen}
						placeholder="Escribe un breve resumen del artículo..."
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					></textarea>
				</div>

				<div>
					<label for="imagen" class="block text-sm font-medium text-gray-700 mb-2">
						Imagen destacada (URL)
					</label>
					<input
						id="imagen"
						type="url"
						bind:value={imagen}
						placeholder="https://ejemplo.com/imagen.jpg"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
				</div>

				<div>
					<label for="etiquetas" class="block text-sm font-medium text-gray-700 mb-2">
						Etiquetas
					</label>
					<input
						id="etiquetas"
						type="text"
						bind:value={etiquetas}
						placeholder="JavaScript, SvelteKit, Web (separadas por comas)"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
					<p class="mt-1 text-sm text-gray-500">Separa las etiquetas con comas</p>
				</div>
			</div>
		</div>

		<div class="bg-white shadow-sm rounded-lg p-6">
			<h2 class="text-lg font-medium text-gray-900 mb-4">Contenido del artículo</h2>
			
			<div class="mb-4">
				<div class="flex border-b border-gray-200">
					<button
						type="button"
						on:click={() => cambiarTab('editor')}
						class="py-2 px-4 text-sm font-medium {activeTab === 'editor' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
					>
						Editor
					</button>
					<button
						type="button"
						on:click={() => cambiarTab('preview')}
						class="py-2 px-4 text-sm font-medium {activeTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
					>
						Vista Previa
					</button>
					<button
						type="button"
						on:click={() => cambiarTab('help')}
						class="py-2 px-4 text-sm font-medium {activeTab === 'help' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
					>
						Ayuda Markdown
					</button>
				</div>
			</div>

			{#if activeTab === 'editor'}
				<div>
					<label for="contenido" class="block text-sm font-medium text-gray-700 mb-2">
						Contenido * (Markdown)
					</label>
					<textarea
						id="contenido"
						bind:value={contenido}
						placeholder="# Mi Artículo

Escribe el contenido usando **Markdown**...

## Sección 1
- Lista de elementos
- Otro elemento

```javascript
// Código de ejemplo
console.log('Hola mundo');
```"
						rows="20"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
						required
					></textarea>
					<p class="mt-1 text-sm text-gray-500">
						Usa Markdown para formatear tu contenido. Consulta la pestaña "Ayuda Markdown" para más información.
					</p>
				</div>
			{/if}

			{#if activeTab === 'preview'}
				<div>
					<h3 class="text-sm font-medium text-gray-700 mb-2">Vista Previa</h3>
					<div class="min-h-[400px] p-4 border border-gray-300 rounded-md bg-gray-50">
						{#if contenido}
							<div class="prose max-w-none">
								{@html markdownPreview}
							</div>
						{:else}
							<p class="text-gray-500 italic">Escribe contenido en el editor para ver la vista previa aquí...</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if activeTab === 'help'}
				<div>
					<h3 class="text-sm font-medium text-gray-700 mb-4">Guía de Markdown</h3>
					<div class="space-y-4 text-sm">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<h4 class="font-medium text-gray-900 mb-2">Texto Básico</h4>
								<div class="bg-gray-50 p-3 rounded font-mono text-xs">
									**Negrita**<br>
									*Cursiva*<br>
									~~Tachado~~<br>
									`Código en línea`
								</div>
							</div>
							<div>
								<h4 class="font-medium text-gray-900 mb-2">Encabezados</h4>
								<div class="bg-gray-50 p-3 rounded font-mono text-xs">
									# Encabezado 1<br>
									## Encabezado 2<br>
									### Encabezado 3<br>
									#### Encabezado 4
								</div>
							</div>
						</div>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<h4 class="font-medium text-gray-900 mb-2">Listas</h4>
								<div class="bg-gray-50 p-3 rounded font-mono text-xs">
									- Elemento 1<br>
									- Elemento 2<br>
									&nbsp;&nbsp;- Sub-elemento<br><br>
									1. Numerado 1<br>
									2. Numerado 2
								</div>
							</div>
							<div>
								<h4 class="font-medium text-gray-900 mb-2">Enlaces e Imágenes</h4>
								<div class="bg-gray-50 p-3 rounded font-mono text-xs">
									[Enlace](https://ejemplo.com)<br>
									![Imagen](url-imagen.jpg)<br>
									![Alt text](imagen.jpg "Título")
								</div>
							</div>
						</div>
						
						<div>
							<h4 class="font-medium text-gray-900 mb-2">Código</h4>
							<div class="bg-gray-50 p-3 rounded font-mono text-xs">
								```javascript<br>
								function ejemplo() {'{'}<br>
								&nbsp;&nbsp;console.log("Hola mundo");<br>
								{'}'}<br>
								```
							</div>
						</div>
						
						<div>
							<h4 class="font-medium text-gray-900 mb-2">Citas</h4>
							<div class="bg-gray-50 p-3 rounded font-mono text-xs">
								> Esta es una cita<br>
								> que puede tener múltiples líneas
							</div>
						</div>
						
						<div>
							<h4 class="font-medium text-gray-900 mb-2">Líneas y Separadores</h4>
							<div class="bg-gray-50 p-3 rounded font-mono text-xs">
								---<br>
								(línea horizontal)
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="bg-white shadow-sm rounded-lg p-6">
			<h2 class="text-lg font-medium text-gray-900 mb-4">Configuración</h2>
			
			<div class="flex items-center">
				<input
					id="publico"
					type="checkbox"
					bind:checked={esPublico}
					class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
				>
				<label for="publico" class="ml-2 block text-sm text-gray-700">
					Hacer público este artículo
				</label>
			</div>
		</div>

		<div class="flex flex-col sm:flex-row gap-4 justify-end">
			<button
				type="button"
				on:click={guardarBorrador}
				disabled={guardandoBorrador}
				class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
			>
				{guardandoBorrador ? 'Guardando...' : 'Guardar borrador'}
			</button>
			
			<button
				type="button"
				on:click={publicarArticulo}
				disabled={publicando}
				class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
			>
				{publicando ? 'Publicando...' : 'Publicar artículo'}
			</button>
		</div>
	</form>
</div>