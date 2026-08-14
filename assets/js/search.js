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

/**
 * Generates an excerpt with highlighted search terms.
 * @param {string} text - The full text of the matching field.
 * @param {Array} positions - Lunr position metadata arrays: [[start, length], ...]
 * @param {number} maxSnippetLen - Target total length of the final snippet string.
 */
function createSnippet(text, positions, maxSnippetLen = 150) {
  if (!positions || positions.length === 0) {
    return text.substring(0, maxSnippetLen) + '...';
  }

  // 1. Sort matches by their starting index
  positions.sort((a, b) => a[0] - b[0]);

  // 2. Pick the first match as the anchor point for our window
  const firstMatchStart = positions[0][0];
  const firstMatchLength = positions[0][1];

  // 3. Center the snippet window around the first match
  let startIdx = Math.max(0, firstMatchStart - Math.floor(maxSnippetLen / 2));
  let endIdx = Math.min(text.length, startIdx + maxSnippetLen);

  // Adjust if window hits the end of the text string
  if (endIdx === text.length) {
    startIdx = Math.max(0, endIdx - maxSnippetLen);
  }

  // 4. Narrow matches to only those that fall within this snippet window
  const visiblePositions = positions.filter(([start]) => start >= startIdx && start <= endIdx);

  // 5. Reconstruct text string from back to front to safely inject HTML tags
  let snippet = text.substring(startIdx, endIdx);

  // Adjust position offsets relative to our snippet window start index
  for (let i = visiblePositions.length - 1; i >= 0; i--) {
    const [start, length] = visiblePositions[i];
    const relStart = start - startIdx;

    const beforeMatch = snippet.substring(0, relStart);
    const matchText = snippet.substring(relStart, relStart + length);
    const afterMatch = snippet.substring(relStart + length);

    snippet = `${beforeMatch}<mark>${matchText}</mark>${afterMatch}`;
  }

  // 6. Append ellipsis indicators if boundaries were clipped
  if (startIdx > 0) snippet = '...' + snippet;
  if (endIdx < text.length) snippet = snippet + '...';

  return snippet;
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
    container.innerHTML = '<article class="no-results">No results found</article>';
    return;
  }

  // Map Lunr results back to your store metadata
  results.forEach(result => {
    const item = searchStore[result.ref]; // Use ref ID to fetch item details

    if (item) {
      const entry = document.createElement('article');
      entry.className = 'result-item';

      const metadata = result.matchData.metadata;

      // Gather all position arrays specifically for the 'body' field
      let bodyPositions = [];
      Object.keys(metadata).forEach(function (term) {
          if (metadata[term].content && metadata[term].content.position) {
              bodyPositions = bodyPositions.concat(metadata[term].content.position);
          }
      });

      const htmlSnippet = createSnippet(item.content, bodyPositions);

      // Inject standard template safely using innerHTML (ensure text is escaped if user-generated)
      entry.innerHTML = `
        <h3><a href="${item.url}">${item.title}</a></h3>
        <p>${htmlSnippet}</p>
      `;

      container.appendChild(entry);
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSearch);

