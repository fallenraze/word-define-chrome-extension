// View terms button
document.getElementById('viewTermsBtn').addEventListener('click', function() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('dictionary-manager.html')
  });
});

// About toggle with dropdown arrow animation
document.getElementById('aboutToggle').addEventListener('click', function() {
  const aboutSection = document.getElementById('aboutSection');
  const dropdownArrow = document.getElementById('dropdownArrow');
  const isHidden = aboutSection.classList.contains('hidden');
  
  if (isHidden) {
    aboutSection.classList.remove('hidden');
    dropdownArrow.classList.add('rotated');
    this.innerHTML = 'Hide <div class="dropdown-arrow rotated" id="dropdownArrow"></div>';
  } else {
    aboutSection.classList.add('hidden');
    dropdownArrow.classList.remove('rotated');
    this.innerHTML = 'Made by Aryan Shah <div class="dropdown-arrow" id="dropdownArrow"></div>';
  }
});