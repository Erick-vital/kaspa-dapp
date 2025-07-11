<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm border-b">
		<nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center">
					<a href="/" class="text-2xl font-bold text-gray-900">Mi Blog</a>
				</div>
				<div class="flex items-center space-x-4">
					<a href="/" class="text-gray-700 hover:text-gray-900">Inicio</a>
					<a href="/articulos" class="text-gray-700 hover:text-gray-900">Artículos</a>
					<a href="/crear" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Escribir</a>
					<button class="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700">Conectar KasWare</button>
				</div>
			</div>
		</nav>
	</header>

	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		{@render children()}
	</main>

	<footer class="bg-white border-t mt-12">
		<div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
			<p class="text-center text-gray-500">© 2025 Mi Blog. Todos los derechos reservados.</p>
		</div>
	</footer>
</div>
