<script lang="ts">
	const articulos = [
		{
			id: 1,
			titulo: 'Introducción a SvelteKit',
			resumen: 'Aprende los conceptos básicos de SvelteKit para crear aplicaciones web modernas.',
			autor: 'Juan Pérez',
			fecha: '2025-01-15',
			etiquetas: ['SvelteKit', 'JavaScript', 'Web'],
			imagen: '/api/placeholder/400/200'
		},
		{
			id: 2,
			titulo: 'Diseño Responsive con Tailwind CSS',
			resumen: 'Cómo crear interfaces responsivas utilizando las utilidades de Tailwind CSS.',
			autor: 'María García',
			fecha: '2025-01-10',
			etiquetas: ['CSS', 'Tailwind', 'Responsive'],
			imagen: '/api/placeholder/400/200'
		},
		{
			id: 3,
			titulo: 'Gestión de Estado en Aplicaciones Frontend',
			resumen: 'Explora diferentes patrones para manejar el estado en aplicaciones modernas.',
			autor: 'Carlos López',
			fecha: '2025-01-05',
			etiquetas: ['Estado', 'Frontend', 'JavaScript'],
			imagen: '/api/placeholder/400/200'
		}
	];
</script>

<div class="px-4 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-4">Todos los Artículos</h1>
		<div class="flex flex-col sm:flex-row gap-4 mb-6">
			<input 
				type="text" 
				placeholder="Buscar artículos..." 
				class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			>
			<select class="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
				<option>Todos los temas</option>
				<option>JavaScript</option>
				<option>CSS</option>
				<option>SvelteKit</option>
			</select>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each articulos as articulo}
			<article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
				<img 
					src={articulo.imagen} 
					alt={articulo.titulo}
					class="w-full h-48 object-cover"
				>
				<div class="p-6">
					<h2 class="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
						<a href="/articulos/{articulo.id}">{articulo.titulo}</a>
					</h2>
					<p class="text-gray-600 mb-4">{articulo.resumen}</p>
					<div class="flex flex-wrap gap-2 mb-4">
						{#each articulo.etiquetas as etiqueta}
							<span class="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
								{etiqueta}
							</span>
						{/each}
					</div>
					<div class="flex items-center justify-between text-sm text-gray-500">
						<span>Por {articulo.autor}</span>
						<span>{articulo.fecha}</span>
					</div>
				</div>
			</article>
		{/each}
	</div>

	<div class="mt-12 flex justify-center">
		<nav class="flex space-x-2">
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">Anterior</button>
			<button class="px-3 py-2 bg-blue-600 text-white rounded">1</button>
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">2</button>
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">3</button>
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">Siguiente</button>
		</nav>
	</div>
</div>