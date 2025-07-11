<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm border-b">
		<nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center">
					<a href="/" class="text-2xl font-bold text-gray-900">My Blog</a>
				</div>
				<div class="flex items-center space-x-4">
					<a href="/" class="text-gray-700 hover:text-gray-900">Home</a>
					<a href="/articles" class="text-gray-700 hover:text-gray-900">Articles</a>
					<a href="/create" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Write</a>
					<button class="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700">Connect KasWare</button>
				</div>
			</div>
		</nav>
	</header>

	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		{@render children()}
	</main>

	<footer class="bg-white border-t mt-12">
		<div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
			<p class="text-center text-gray-500">© 2025 My Blog. All rights reserved.</p>
		</div>
	</footer>
</div>
