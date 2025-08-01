let dictionary = {};

fetch(chrome.runtime.getURL("dictionary.json"))
  .then((res) => res.json())
  .then((data) => {
    dictionary = data;
  });

// Function to get selected text that works across different contexts
function getSelectedText() {
  // First try standard window selection
  let selectedText = window.getSelection().toString().trim();
  
  if (selectedText) {
    return selectedText;
  }
  
  // Try to get selection from Google Docs
  try {
    // Google Docs stores selection in a different way
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.contentEditable === 'true' || activeElement.tagName === 'IFRAME')) {
      // For Google Docs, we might need to look for the selection within the document
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        selectedText = selection.toString().trim();
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  // Try to get selection from PDF viewers
  try {
    // For PDF.js viewers
    const textLayer = document.querySelector('.textLayer');
    if (textLayer) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        selectedText = selection.toString().trim();
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return selectedText;
}

// Function to get cursor/selection position that works across different contexts
function getCursorPosition(e) {
  let x, y;
  
  if (e && e.clientX && e.clientY) {
    // Use event coordinates if available
    x = e.clientX;
    y = e.clientY;
  } else {
    // Try to get selection coordinates
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        x = rect.left + (rect.width / 2);
        y = rect.top + (rect.height / 2);
      } else {
        // Fallback to center of viewport
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
      }
    } else {
      // Fallback to center of viewport
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }
  }
  
  return { x, y };
}

document.addEventListener("dblclick", (e) => {
  const word = getSelectedText().toLowerCase();
  if (word && dictionary[word]) {
    const pos = getCursorPosition(e);
    showDefinition(word, dictionary[word], pos.x, pos.y);
  }
  // If word is not in dictionary, don't show any popup
});

// Add hotkey listener for Ctrl+\
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "\\") {
    e.preventDefault(); // prevent default browser behavior
    const selectedText = getSelectedText().toLowerCase();
    if (selectedText) {
      const pos = getCursorPosition();
      
      if (dictionary[selectedText]) {
        showDefinition(selectedText, dictionary[selectedText], pos.x, pos.y);
      } else {
        // Show "No definition found" for hotkey usage
        showDefinition(selectedText, "No definition found", pos.x, pos.y, true);
      }
    }
  }
});

function showDefinition(word, definition, mouseX, mouseY, isNotFound = false) {
  // remove any existing popup
  document.querySelectorAll(".word-popup").forEach(el => el.remove());

  const popup = document.createElement("div");
  popup.className = "word-popup";
  
  // Format the content based on whether definition is array or string
  let content = `<div class="word-term"><strong>${word}</strong></div>`;
  content += '<div class="definition-separator"></div>';
  
  if (isNotFound) {
    // Handle "No definition found" case
    content += `<div class="definition-item no-definition-found">${definition}</div>`;
  } else if (Array.isArray(definition)) {
    // Handle array of definitions
    content += '<div class="definitions-container">';
    definition.forEach((def, index) => {
      if (index > 0) {
        content += '<div class="definition-separator"></div>';
      }
      content += `<div class="definition-item">${def}</div>`;
    });
    content += '</div>';
  } else {
    // Handle single definition
    content += `<div class="definition-item">${definition}</div>`;
  }
  
  popup.innerHTML = content;
  
  popup.style.position = "fixed"; //fixed positioning relative to viewport
  popup.style.visibility = "hidden";
  
  document.body.appendChild(popup);
  
  // Get popup dimensions
  const popupRect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // default location of popup: centered and above cursor
  let left = mouseX - (popupRect.width / 2); 
  let top = mouseY - popupRect.height - 15; 
  
  // adjust if popup would go off the right edge
  if (left + popupRect.width > viewportWidth - 10) {
    left = viewportWidth - popupRect.width - 10;
  }
  
  // adjust if popup would go off the left edge
  if (left < 10) {
    left = 10;
  }
  
  // adjust if popup would go off the top edge
  if (top < 10) {
    top = mouseY + 15; // position below cursor
  }
  
  // adjust if popup would go off the bottom edge  
  if (top + popupRect.height > viewportHeight - 10) {
    top = mouseY + 15; // position below cursor
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.visibility = "visible";

  // remove popup on click outside or on escape key
  function onClickOutside(event) {
    if (!popup.contains(event.target)) {
      popup.remove();
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onEscapeKey);
    }
  }
  
  function onEscapeKey(event) {
    if (event.key === "Escape") {
      popup.remove();
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onEscapeKey);
    }
  }
  
  document.addEventListener("click", onClickOutside);
  document.addEventListener("keydown", onEscapeKey);
}