// ── THEME TOGGLE
document.querySelectorAll('.skill-tag.has-logo img').forEach((img) => {
  img.addEventListener('error', () => {
    img.closest('.skill-tag')?.classList.remove('has-logo');
    img.remove();
  });
});

const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

const currentTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
  const newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

// ── TYPEWRITER EFFECT
const typewriterWords = [
  "AI Security Engineer",
  "Penetration Tester",
  "LLM Defense Builder",
  "Bug Hunter · n0xvector"
];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typewriterText = document.querySelector('.typewriter-text');

function type() {
  const currentWord = typewriterWords[wordIndex];
  if (isDeleting) {
    typewriterText.textContent = currentWord.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typewriterText.textContent = currentWord.substring(0, charIndex + 1);
    charIndex++;
  }

  let typeSpeed = isDeleting ? 50 : 100;

  if (!isDeleting && charIndex === currentWord.length) {
    typeSpeed = 2500; // Wait at end
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    wordIndex = (wordIndex + 1) % typewriterWords.length;
    typeSpeed = 500;
  }

  setTimeout(type, typeSpeed);
}
type();

// ── COUNT UP ANIMATION
function countUp(el) {
  const target = parseInt(el.getAttribute('data-target'));
  const count = +el.innerText;
  const speed = 200;
  const inc = target / speed;

  if (count < target) {
    el.innerText = Math.ceil(count + inc);
    setTimeout(() => countUp(el), 1);
  } else {
    el.innerText = target + '+';
  }
}

// ── CURSOR
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
function animCursor() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  cursor.style.left = mx + 'px';
  cursor.style.top = my + 'px';
  ring.style.left = rx + 'px';
  ring.style.top = ry + 'px';
  requestAnimationFrame(animCursor);
}
animCursor();

function updateCursorListeners() {
  document.querySelectorAll('a, button, .project-card, .cert-item, .stat-card, .skill-tag').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}
updateCursorListeners();

// ── SCROLL REVEAL & COUNTUP OBSERVER
const observerOptions = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' };
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      if (e.target.classList.contains('stat-value') && e.target.hasAttribute('data-target')) {
        countUp(e.target);
      }
      observer.unobserve(e.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
document.querySelectorAll('.stat-value[data-target]').forEach(el => observer.observe(el));

// ── NAV SCROLL
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Trigger hero reveals on load
window.addEventListener('load', () => {
  document.querySelectorAll('#hero .reveal').forEach(el => {
    setTimeout(() => el.classList.add('visible'), 200);
  });
});

// ── SCROLL SPY (ACTIVE NAV)
const navLinks = document.querySelectorAll('.nav-links a');
const spySections = document.querySelectorAll('section[id]');
const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href').substring(1) === entry.target.id);
      });
    }
  });
}, { threshold: 0.5, rootMargin: "-10% 0px -70% 0px" });
spySections.forEach(section => spyObserver.observe(section));

// ── SECTION NUMBER COUNT-UP
const numObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.innerText);
      if (isNaN(target)) return;
      let count = 0;
      const duration = 600;
      const startTime = performance.now();
      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentCount = Math.floor(progress * target);
        el.innerText = currentCount.toString().padStart(2, '0');
        if (progress < 1) requestAnimationFrame(update);
        else el.innerText = target.toString().padStart(2, '0');
      }
      requestAnimationFrame(update);
      numObserver.unobserve(el);
    }
  });
}, { threshold: 1 });
document.querySelectorAll('.section-num').forEach(num => numObserver.observe(num));

// ── PARALLAX HEADERS
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  document.querySelectorAll('.section-header h2').forEach(header => {
    const parent = header.closest('section') || header.parentElement;
    const rect = parent.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const offset = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * 0.1;
      header.style.transform = `translateY(${Math.min(Math.max(offset, -30), 30)}px)`;
    }
  });
});

// ── CURSOR TRAIL (DESKTOP ONLY)
if (!('ontouchstart' in window)) {
  const trailCount = 5;
  const dots = [];
  for (let i = 0; i < trailCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'cursor-trail-dot';
    document.body.appendChild(dot);
    dots.push({ el: dot, x: 0, y: 0, tx: 0, ty: 0, delay: i * 3 });
  }
  let tx = 0, ty = 0;
  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  function updateTrail() {
    dots.forEach((dot, index) => {
      const prev = index === 0 ? { x: tx, y: ty } : dots[index - 1];
      dot.x += (prev.x - dot.x) * 0.35;
      dot.y += (prev.y - dot.y) * 0.35;
      dot.el.style.left = dot.x + 'px';
      dot.el.style.top = dot.y + 'px';
      dot.el.style.opacity = (1 - index / trailCount) * 0.4;
      dot.el.style.transform = `translate(-50%, -50%) scale(${1 - index / trailCount})`;
    });
    requestAnimationFrame(updateTrail);
  }
  updateTrail();
}

// ── PROJECT MODAL
const modal = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openModal(card) {
  const name = card.querySelector('.project-name').innerText;
  const status = card.querySelector('.project-status') ? card.querySelector('.project-status').outerHTML : '';
  const tagline = card.querySelector('.project-tagline').innerText;
  const desc = card.querySelector('.project-desc') ? card.querySelector('.project-desc').innerText : tagline;
  const tags = card.querySelector('.project-tags').innerHTML;
  const meta = card.querySelector('.project-meta') ? card.querySelector('.project-meta').outerHTML.replace('project-meta', 'project-meta modal-meta') : '';
  const link = card.querySelector('.project-btn').href;

  modalBody.innerHTML = `
    <div class="modal-header">
      <div class="modal-status">${status}</div>
      <h2 class="modal-title">${name}</h2>
      <p class="modal-tagline">${tagline}</p>
    </div>
    <div class="modal-desc">${desc}</div>
    ${meta}
    <div class="modal-tags">${tags.replace(/project-tag/g, 'modal-tag')}</div>
    <a href="${link}" target="_blank" class="modal-action">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
      GitHub Repository
    </a>
  `;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A' && !e.target.closest('a')) openModal(card);
  });
});
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ── HORIZONTAL SCROLL (DRAG + BUTTONS + AUTO)
const scrollContainer = document.querySelector('.projects-featured-track');
const dotsContainer = document.getElementById('carousel-dots');
const prevBtn = document.getElementById('scroll-prev');
const nextBtn = document.getElementById('scroll-next');

// Constants for scroll logic
const getCardWidth = () => {
  const firstCard = scrollContainer.querySelector('.project-card');
  if (!firstCard) return scrollContainer.clientWidth;
  const styles = window.getComputedStyle(scrollContainer);
  const gap = parseFloat(styles.columnGap || styles.gap || 0) || 0;
  return firstCard.getBoundingClientRect().width + gap;
};

// Create dots dynamically
const featuredCardCount = scrollContainer.querySelectorAll('.project-card').length;
for (let i = 0; i < featuredCardCount; i++) {
  const dot = document.createElement('div');
  dot.className = 'dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => {
    scrollContainer.scrollTo({ left: i * getCardWidth(), behavior: 'smooth' });
    resetAutoSlide();
  });
  dotsContainer.appendChild(dot);
}

function updateCarouselUI() {
  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
  const cardWidth = getCardWidth();
  
  // Update buttons
  prevBtn.disabled = scrollLeft <= 0;
  nextBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 5;

  // Update dots
  const activeIndex = Math.round(scrollLeft / cardWidth);
  document.querySelectorAll('.dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx === activeIndex);
  });
}

scrollContainer.addEventListener('scroll', updateCarouselUI);
window.addEventListener('resize', updateCarouselUI);

// Auto-slide logic
let autoSlideInterval;
const carouselDesktop = window.matchMedia('(min-width: 601px)');
function startAutoSlide() {
  stopAutoSlide();
  if (!carouselDesktop.matches) return;
  autoSlideInterval = setInterval(() => {
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    const cardWidth = getCardWidth();
    // Loop back to start if near the end
    if (scrollLeft + clientWidth >= scrollWidth - 10) {
      scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      scrollContainer.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  }, 3500);
}

function stopAutoSlide() {
  clearInterval(autoSlideInterval);
}

function resetAutoSlide() {
  stopAutoSlide();
  startAutoSlide();
}

carouselDesktop.addEventListener('change', () => {
  updateCarouselUI();
  if (carouselDesktop.matches) startAutoSlide();
  else stopAutoSlide();
});

const carouselWrapper = document.querySelector('.projects-featured-container');
carouselWrapper.addEventListener('mouseenter', stopAutoSlide);
carouselWrapper.addEventListener('mouseleave', startAutoSlide);

nextBtn.addEventListener('click', () => {
  scrollContainer.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
  resetAutoSlide();
});
prevBtn.addEventListener('click', () => {
  scrollContainer.scrollBy({ left: -getCardWidth(), behavior: 'smooth' });
  resetAutoSlide();
});

// Drag to scroll logic
let isDown = false, startX, scrollLeftVal;
scrollContainer.addEventListener('mousedown', (e) => {
  isDown = true;
  startX = e.pageX - scrollContainer.offsetLeft;
  scrollLeftVal = scrollContainer.scrollLeft;
  stopAutoSlide();
});
scrollContainer.addEventListener('mouseleave', () => { isDown = false; });
scrollContainer.addEventListener('mouseup', () => { 
  isDown = false; 
  if (!carouselWrapper.matches(':hover')) startAutoSlide();
});
scrollContainer.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - scrollContainer.offsetLeft;
  const walk = (x - startX) * 2;
  scrollContainer.scrollLeft = scrollLeftVal - walk;
});

// Initialization
startAutoSlide();
updateCarouselUI();

// ── COPY EMAIL
const emailLink = document.querySelector('a[href^="mailto: sangameshs2003"]') || document.querySelector('.contact-link-item[href^="mailto"]');
const toast = document.getElementById('email-toast');

if (emailLink) {
  emailLink.addEventListener('click', (e) => {
    const email = "sangameshs2003@gmail.com";
    if (window.innerWidth > 900 && navigator.clipboard) {
      e.preventDefault();
      navigator.clipboard.writeText(email).then(() => {
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 2500);
      });
    }
  });
}

// ── SKILL FILTER
document.querySelectorAll('.skill-tag').forEach(tag => {
  tag.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = tag.classList.contains('active');
    document.querySelectorAll('.skill-tag').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.project-card').forEach(c => {
      c.classList.remove('dimmed', 'project-highlight');
    });

    if (!isActive) {
      tag.classList.add('active');
      const skillName = tag.innerText.toLowerCase();
      document.querySelectorAll('.project-card').forEach(card => {
        const cardTags = Array.from(card.querySelectorAll('.project-tag')).map(t => t.innerText.toLowerCase());
        const matches = cardTags.some(t => t.includes(skillName));
        if (matches) card.classList.add('project-highlight');
        else card.classList.add('dimmed');
      });
    }
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.skill-tag').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.project-card').forEach(c => {
    c.classList.remove('dimmed', 'project-highlight');
  });
});

// ── BACK TO TOP
const btt = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  btt.classList.toggle('active', window.scrollY > 400);
});
btt.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── MOBILE MENU
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

function toggleMenu() {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
}

hamburger.addEventListener('click', toggleMenu);
mobileLinks.forEach(link => {
  link.addEventListener('click', toggleMenu);
});
