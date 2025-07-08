let dictionary = {};

fetch(chrome.runtime.getURL("dictionary.json"))
  .then((res) => res.json())
  .then((data) => {
    dictionary = data;
  });

document.addEventListener("dblclick", (e) => {
  const word = window.getSelection().toString().trim().toLowerCase();
  if (word && dictionary[word]) {
    // use mouse position at the time of double-click
    showDefinition(word, dictionary[word], e.clientX, e.clientY);
  }
});

// Add hotkey listener for Ctrl+\
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "\\") {
    e.preventDefault(); // prevent default browser behavior
    const selectedText = window.getSelection().toString().trim().toLowerCase();
    if (selectedText && dictionary[selectedText]) {
      // Get the selection's bounding rect to position popup
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).getBoundingClientRect();
        const centerX = range.left + (range.width / 2);
        const centerY = range.top + (range.height / 2);
        showDefinition(selectedText, dictionary[selectedText], centerX, centerY);
      }
    }
  }
});

function showDefinition(word, definition, mouseX, mouseY) {
  // remove any existing popup
  document.querySelectorAll(".word-popup").forEach(el => el.remove());

  const popup = document.createElement("div");
  popup.className = "word-popup";
  
  // Format the content based on whether definition is array or string
  let content = `<div class="word-term"><strong>${word}</strong></div>`;
  
  if (Array.isArray(definition)) {
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
    content += `<div class="definition-separator"></div>`;
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
