// Runs before the first paint, so a stored theme choice never flashes the other one.
// Kept apart from site.js because that one is a module, and modules run late.
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
  try {
    var choice = localStorage.getItem('reins-theme');
    if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
  } catch (e) {
    /* storage is blocked: the page follows the system setting */
  }
})();
