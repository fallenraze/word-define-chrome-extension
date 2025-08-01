let dictionary = {};
let originalDictionary = {};
let hasChanges = false;
let searchTimeout;

// Load dictionary
fetch(chrome.runtime.getURL("dictionary.json"))
  .then(res => res.json())
  .then(data => {
    dictionary = data;
    originalDictionary = JSON.parse(JSON.stringify(data));
    renderTable();
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('dictionaryTable').classList.remove('hidden');
    
    // Initialize results info
    updateResultsInfo(Object.keys(dictionary).length, Object.keys(dictionary).length);
  })
  .catch(err => {
    console.error('Error loading dictionary:', err);
    document.getElementById('loading').textContent = 'Error loading dictionary';
  });

// Optimized search functionality with debouncing
document.getElementById('searchBox').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  
  // Clear previous timeout
  clearTimeout(searchTimeout);
  
  // Set new timeout for debouncing
  searchTimeout = setTimeout(() => {
    performSearch(searchTerm);
  }, 300); // 300ms delay
});

function performSearch(searchTerm) {
  const tbody = document.getElementById('tableBody');
  const rows = tbody.children;
  let visibleCount = 0;
  const totalCount = Object.keys(dictionary).length;
  
  // If no search term, show all rows
  if (!searchTerm) {
    for (let i = 0; i < rows.length; i++) {
      rows[i].style.display = '';
    }
    updateResultsInfo(totalCount, totalCount);
    return;
  }
  
  // Use DocumentFragment for better performance when hiding/showing many rows
  const fragment = document.createDocumentFragment();
  const visibleRows = [];
  const hiddenRows = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const termCell = row.querySelector('.term-cell');
    const definitionCell = row.querySelector('.definition-cell');
    
    if (termCell && definitionCell) {
      const term = termCell.textContent.toLowerCase();
      const definitions = definitionCell.textContent.toLowerCase();
      
      if (term.includes(searchTerm) || definitions.includes(searchTerm)) {
        visibleRows.push(row);
        visibleCount++;
      } else {
        hiddenRows.push(row);
      }
    }
  }
  
  // Batch DOM updates
  visibleRows.forEach(row => row.style.display = '');
  hiddenRows.forEach(row => row.style.display = 'none');
  
  // Update results info
  updateResultsInfo(visibleCount, totalCount, searchTerm);
}

function updateResultsInfo(visible, total, searchTerm = null) {
  const resultsInfo = document.getElementById('resultsInfo');
  
  if (searchTerm) {
    resultsInfo.textContent = `${visible.toLocaleString()} term(s) out of ${total.toLocaleString()} terms`;
  } else {
    resultsInfo.textContent = `${total.toLocaleString()} terms`;
  }
}

// Dropdown functionality
document.getElementById('dropdownToggle').addEventListener('click', function(e) {
  e.stopPropagation();
  const menu = document.getElementById('dropdownMenu');
  menu.classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const dropdown = document.querySelector('.dropdown-container');
  const menu = document.getElementById('dropdownMenu');
  
  if (!dropdown.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// Bulk add terms button
document.getElementById('bulkAddBtn').addEventListener('click', function() {
  document.getElementById('csvFile').click();
  document.getElementById('dropdownMenu').classList.add('hidden');
});

// Add new term button
document.getElementById('addNewTermBtn').addEventListener('click', function() {
  showNewTermModal();
});

// About button
document.getElementById('aboutBtn').addEventListener('click', function() {
  showAboutModal();
});

// Modal functionality
function showNewTermModal() {
  document.getElementById('newTermModal').classList.remove('hidden');
  document.getElementById('newTermInput').focus();
}

function hideNewTermModal() {
  document.getElementById('newTermModal').classList.add('hidden');
  document.getElementById('newTermInput').value = '';
  document.getElementById('newDefinitionInput').value = '';
}

function showAboutModal() {
  document.getElementById('aboutModal').classList.remove('hidden');
}

function hideAboutModal() {
  document.getElementById('aboutModal').classList.add('hidden');
}

document.getElementById('closeModalBtn').addEventListener('click', hideNewTermModal);
document.getElementById('cancelBtn').addEventListener('click', hideNewTermModal);
document.getElementById('closeAboutBtn').addEventListener('click', hideAboutModal);

// Close modals when clicking outside
document.getElementById('newTermModal').addEventListener('click', function(e) {
  if (e.target === this) {
    hideNewTermModal();
  }
});

document.getElementById('aboutModal').addEventListener('click', function(e) {
  if (e.target === this) {
    hideAboutModal();
  }
});

// Save new term
document.getElementById('saveNewTermBtn').addEventListener('click', function() {
  const term = document.getElementById('newTermInput').value.toLowerCase().trim();
  const definitionText = document.getElementById('newDefinitionInput').value.trim();
  
  if (!term || !definitionText) {
    alert('Please enter both a term and definition.');
    return;
  }
  
  if (dictionary[term]) {
    if (!confirm(`Term "${term}" already exists. Do you want to overwrite it?`)) {
      return;
    }
  }
  
  // Parse definitions (split by | for arrays)
  const definitions = definitionText.includes(' | ') ? 
    definitionText.split(' | ').map(d => d.trim()).filter(d => d) : 
    definitionText;
  
  dictionary[term] = definitions;
  hasChanges = true;
  renderTable();
  hideNewTermModal();
  
  // Update results info after adding new term
  updateResultsInfo(Object.keys(dictionary).length, Object.keys(dictionary).length);
});

// CSV file upload
document.getElementById('csvFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const csv = event.target.result;
    const lines = csv.split('\n').filter(line => line.trim());
    let addedCount = 0;
    
    lines.forEach(line => {
      const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      if (columns.length < 2) return;
      
      const term = columns[0].toLowerCase();
      const definitions = columns.slice(1).filter(def => def);
      
      if (dictionary[term]) {
        // Add to existing array
        if (Array.isArray(dictionary[term])) {
          dictionary[term] = [...dictionary[term], ...definitions];
        } else {
          dictionary[term] = [dictionary[term], ...definitions];
        }
      } else {
        // Create new entry
        dictionary[term] = definitions.length === 1 ? definitions[0] : definitions;
        addedCount++;
      }
    });
    
    hasChanges = true;
    renderTable();
    alert(`Successfully processed CSV file. Added ${addedCount} new terms.`);
    e.target.value = ''; // Reset file input
    
    // Update results info after bulk add
    updateResultsInfo(Object.keys(dictionary).length, Object.keys(dictionary).length);
  };
  reader.readAsText(file);
});

// Save changes
document.getElementById('saveBtn').addEventListener('click', function() {
  const jsonString = JSON.stringify(dictionary, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dictionary.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  originalDictionary = JSON.parse(JSON.stringify(dictionary));
  hasChanges = false;
  alert('Dictionary saved successfully!');
});

function renderTable() {
  const tbody = document.getElementById('tableBody');
  
  // Clear the tbody first
  tbody.innerHTML = '';
  
  const sortedTerms = Object.keys(dictionary).sort();
  
  // Use DocumentFragment for better performance with large datasets
  const fragment = document.createDocumentFragment();
  
  sortedTerms.forEach(term => {
    const row = createTableRow(term, dictionary[term]);
    fragment.appendChild(row);
  });
  
  // Append all rows at once
  tbody.appendChild(fragment);
  
  // Add event listeners to all buttons
  addTableEventListeners();
  
  // Re-apply current search if there is one
  const currentSearch = document.getElementById('searchBox').value;
  if (currentSearch) {
    performSearch(currentSearch.toLowerCase().trim());
  } else {
    // Update results info for full table
    updateResultsInfo(Object.keys(dictionary).length, Object.keys(dictionary).length);
  }
}

function createTableRow(term, definition) {
  const row = document.createElement('tr');
  row.dataset.originalTerm = term; // Store original term for tracking
  row.innerHTML = `
    <td class="actions-cell">
      <button class="btn btn-sm btn-primary btn-icon edit-btn">✎</button>
      <button class="btn btn-sm btn-danger btn-icon delete-btn hidden">✕</button>
    </td>
    <td class="term-cell">${escapeHtml(term)}</td>
    <td class="definition-cell">${formatDefinition(definition)}</td>
  `;
  return row;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addTableEventListeners() {
  // Add edit button listeners
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      toggleEdit(this);
    });
  });
  
  // Add delete button listeners
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteTerm(this);
    });
  });
}

function formatDefinition(definition) {
  if (Array.isArray(definition)) {
    return definition.map(def => escapeHtml(def)).join('<br><br>');
  }
  return escapeHtml(definition);
}

function toggleEdit(btn) {
  const row = btn.closest('tr');
  const termCell = row.querySelector('.term-cell');
  const defCell = row.querySelector('.definition-cell');
  const deleteBtn = row.querySelector('.delete-btn');
  
  if (btn.textContent === '✎') {
    // Enter edit mode
    const currentTerm = termCell.textContent;
    const originalTerm = row.dataset.originalTerm;
    const originalDef = dictionary[originalTerm];
    
    // Convert definition back to editable format
    let defText;
    if (Array.isArray(originalDef)) {
      defText = originalDef.join(' | ');
    } else {
      defText = originalDef;
    }
    
    termCell.innerHTML = `<input type="text" class="editable" value="${escapeHtml(currentTerm)}">`;
    defCell.innerHTML = `<textarea class="editable" rows="3">${escapeHtml(defText)}</textarea>`;
    
    btn.textContent = '✓';
    btn.className = btn.className.replace('btn-primary', 'btn-success');
    deleteBtn.classList.remove('hidden');
  } else {
    // Save edit
    const newTerm = termCell.querySelector('input').value.toLowerCase().trim();
    const newDefText = defCell.querySelector('textarea').value.trim();
    
    if (!newTerm || !newDefText) {
      alert('Please enter both a term and definition.');
      return;
    }
    
    // Get the original term from the dataset
    const oldTerm = row.dataset.originalTerm;
    
    // Delete old term if name changed
    if (oldTerm !== newTerm && dictionary[oldTerm]) {
      delete dictionary[oldTerm];
    }
    
    // Parse definitions (split by | for arrays)
    const definitions = newDefText.includes(' | ') ? 
      newDefText.split(' | ').map(d => d.trim()).filter(d => d) : 
      newDefText;
    
    dictionary[newTerm] = definitions;
    hasChanges = true;
    
    // Update the dataset to track the new term
    row.dataset.originalTerm = newTerm;
    
    termCell.textContent = newTerm;
    defCell.innerHTML = formatDefinition(definitions);
    
    btn.textContent = '✎';
    btn.className = btn.className.replace('btn-success', 'btn-primary');
    deleteBtn.classList.add('hidden');
  }
}

function deleteTerm(btn) {
  const row = btn.closest('tr');
  const termInput = row.querySelector('.term-cell input');
  const term = termInput ? termInput.value.toLowerCase() : row.dataset.originalTerm;
  
  if (confirm(`Are you sure you want to delete "${term}"?`)) {
    delete dictionary[term];
    hasChanges = true;
    row.remove();
  }
}

// Warn about unsaved changes
window.addEventListener('beforeunload', function(e) {
  if (hasChanges) {
    e.preventDefault();
    return '';
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Escape key to close modals
  if (e.key === 'Escape') {
    if (!document.getElementById('newTermModal').classList.contains('hidden')) {
      hideNewTermModal();
    }
    if (!document.getElementById('aboutModal').classList.contains('hidden')) {
      hideAboutModal();
    }
  }
  
  // Ctrl+N to add new term
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    showNewTermModal();
  }
});