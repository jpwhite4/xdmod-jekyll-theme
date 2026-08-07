// Global variables to hold search index and content store
let searchIndex;
let searchStore;

// 1. Fetch your pre-built index and store
async function initSearch() {
  try {
    const response = await fetch('search-data.json');
    searchStore = await response.json();
    
    searchIndex = lunr(function(){
        this.ref('id');
        this.field('title', { boost: 200 });
        this.field('content', { boost: 2 });
        this.field('relUrl');
        this.metadataWhitelist = ['position']

        for (var i in searchStore) {
          this.add({
            id: i,
            title: searchStore[i].title,
            content: searchStore[i].content,
            relUrl: searchStore[i].relUrl
          });
        }
      });

    // Activate the input listener once data is ready
    document.getElementById('search-input').addEventListener('input', handleSearch);
  } catch (error) {
    console.error('Failed to load search index:', error);
  }
}

// 2. Handle input events and run queries
function handleSearch(event) {
  const query = event.target.value.trim();
  const resultsContainer = document.getElementById('search-results');
  
  // Clear results if the query is too short
  if (query.length < 2) {
    resultsContainer.innerHTML = '';
    return;
  }

  // Execute search against the Lunr index
  const results = searchIndex.search(query);
  
  // Render the matching results to the DOM
  renderResults(results, resultsContainer);
}

// 3. Construct and display the result elements
function renderResults(results, container) {
  // Clear any existing results from previous queries
  container.innerHTML = '';

  if (results.length === 0) {
    container.innerHTML = '<li class="no-results">No results found</li>';
    return;
  }

  // Map Lunr results back to your store metadata
  results.forEach(result => {
    const item = searchStore[result.ref]; // Use ref ID to fetch item details
    
    if (item) {
      const li = document.createElement('li');
      li.className = 'search-result-item';
      
      // Inject standard template safely using innerHTML (ensure text is escaped if user-generated)
      li.innerHTML = `
        <h3><a href="${item.url}">${item.title}</a></h3>
        <p>${item.description}</p>
        <small class="search-score">Match confidence: ${(result.score).toFixed(2)}</small>
      `;
      
      container.appendChild(li);
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSearch);

