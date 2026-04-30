(function () {
  var BREAKPOINT = 900;

  if (typeof window.__razolMobileMenuCleanup === 'function') {
    window.__razolMobileMenuCleanup();
  }

  var burger = document.getElementById('navBurger');
  var navLinks = document.querySelector('.nav-links');
  if (!burger || !navLinks) return;

  var staleOverlay = document.getElementById('mobile-nav-overlay');
  if (staleOverlay) staleOverlay.remove();

  var freshBurger = burger.cloneNode(true);
  if (burger.parentNode) {
    burger.parentNode.replaceChild(freshBurger, burger);
  }
  burger = freshBurger;

  var overlay = document.createElement('div');
  overlay.id = 'mobile-nav-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'bottom:0',
    'width:100%',
    'height:100%',
    'background:#19150F',
    'z-index:99999',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:clamp(20px,4vh,44px)',
    'transform:translateX(100%)',
    'transition:transform .35s cubic-bezier(.4,0,.2,1)',
    'pointer-events:none',
    'padding:80px 40px',
    'box-sizing:border-box'
  ].join(';');

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = [
    'position:absolute',
    'top:24px',
    'right:24px',
    'background:none',
    'border:none',
    'color:#F5F0E8',
    'font-size:22px',
    'cursor:pointer',
    'padding:8px',
    'line-height:1'
  ].join(';');
  overlay.appendChild(closeBtn);

  navLinks.querySelectorAll('li').forEach(function (li) {
    var sourceLink = li.querySelector('a');
    if (!sourceLink) return;

    var link = document.createElement('a');
    link.href = sourceLink.href;
    link.textContent = sourceLink.textContent;
    if (sourceLink.target) link.target = sourceLink.target;
    link.style.cssText = [
      'font-family:"DM Sans",sans-serif',
      'font-size:clamp(16px,4vw,22px)',
      'letter-spacing:.2em',
      'text-transform:uppercase',
      'color:#F5F0E8',
      'text-decoration:none',
      'font-weight:300',
      'padding:8px 0',
      'display:block',
      'text-align:center',
      'transition:color .2s'
    ].join(';');
    link.addEventListener('mouseover', function () {
      this.style.color = '#C8A96E';
    });
    link.addEventListener('mouseout', function () {
      this.style.color = '#F5F0E8';
    });
    link.addEventListener('click', function () {
      closeMenu();
    });
    overlay.appendChild(link);
  });

  document.body.appendChild(overlay);

  var isOpen = false;

  function isMobile() {
    return window.innerWidth <= BREAKPOINT;
  }

  function openMenu() {
    isOpen = true;
    overlay.style.transform = 'translateX(0)';
    overlay.style.pointerEvents = 'auto';
    overlay.setAttribute('aria-hidden', 'false');
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    isOpen = false;
    overlay.style.transform = 'translateX(100%)';
    overlay.style.pointerEvents = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function syncMode() {
    if (isMobile()) {
      navLinks.style.display = 'none';
      return;
    }

    closeMenu();
    navLinks.style.display = '';
  }

  function onBurgerClick(event) {
    if (!isMobile()) return;
    event.preventDefault();
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  }

  function onCloseClick(event) {
    event.stopPropagation();
    closeMenu();
  }

  function onOverlayClick(event) {
    if (event.target === overlay) {
      closeMenu();
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      closeMenu();
    }
  }

  burger.addEventListener('click', onBurgerClick);
  closeBtn.addEventListener('click', onCloseClick);
  overlay.addEventListener('click', onOverlayClick);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', syncMode);
  syncMode();

  window.__razolMobileMenuCleanup = function () {
    closeMenu();
    burger.removeEventListener('click', onBurgerClick);
    closeBtn.removeEventListener('click', onCloseClick);
    overlay.removeEventListener('click', onOverlayClick);
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', syncMode);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    delete window.__razolMobileMenuCleanup;
  };
})();
