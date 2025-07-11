<script lang="ts">
	const articles = [
		{
			id: 1,
			title: 'Introduction to SvelteKit',
			summary: 'Learn the basic concepts of SvelteKit to create modern web applications.',
			author: 'John Pérez',
			date: '2025-01-15',
			tags: ['SvelteKit', 'JavaScript', 'Web'],
			image: '/api/placeholder/400/200'
		},
		{
			id: 2,
			title: 'Responsive Design with Tailwind CSS',
			summary: 'How to create responsive interfaces using Tailwind CSS utilities.',
			author: 'Maria García',
			date: '2025-01-10',
			tags: ['CSS', 'Tailwind', 'Responsive'],
			image: '/api/placeholder/400/200'
		},
		{
			id: 3,
			title: 'State Management in Frontend Applications',
			summary: 'Explore different patterns for handling state in modern applications.',
			author: 'Carlos López',
			date: '2025-01-05',
			tags: ['State', 'Frontend', 'JavaScript'],
			image: '/api/placeholder/400/200'
		}
	];
</script>

<div class="px-4 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-4">All Articles</h1>
		<div class="flex flex-col sm:flex-row gap-4 mb-6">
			<input 
				type="text" 
				placeholder="Search articles..." 
				class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			>
			<select class="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
				<option>All topics</option>
				<option>JavaScript</option>
				<option>CSS</option>
				<option>SvelteKit</option>
			</select>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each articles as article}
			<article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
				<img 
					src={article.image} 
					alt={article.title}
					class="w-full h-48 object-cover"
				>
				<div class="p-6">
					<h2 class="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
						<a href="/articles/{article.id}">{article.title}</a>
					</h2>
					<p class="text-gray-600 mb-4">{article.summary}</p>
					<div class="flex flex-wrap gap-2 mb-4">
						{#each article.tags as tag}
							<span class="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
								{tag}
							</span>
						{/each}
					</div>
					<div class="flex items-center justify-between text-sm text-gray-500">
						<span>By {article.author}</span>
						<span>{article.date}</span>
					</div>
				</div>
			</article>
		{/each}
	</div>

	<div class="mt-12 flex justify-center">
		<nav class="flex space-x-2">
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">Previous</button>
			<button class="px-3 py-2 bg-blue-600 text-white rounded">1</button>
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">2</button>
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">3</button>
			<button class="px-3 py-2 text-gray-500 hover:text-gray-700">Next</button>
		</nav>
	</div>
</div>