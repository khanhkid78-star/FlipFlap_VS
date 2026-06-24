
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 12);
});


const burger = document.getElementById('navBurger');
if (burger) {
  burger.addEventListener('click', () => {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
  });
}


const heroSlides = [
  { chip:'Default · All Subjects',
    icon:'auto_awesome',
    headline:'Unlock knowledge',
    accentText:'in seconds.',
    lead:'Flip Flash helps you turn every subject into flashcards, organized neatly with Deck → Folder → Set.',
    from: '#4b2416',
    to: '#7a3e1d',
    accent: '#ffd4aa',
    q:'What is Flip Flash?',
    a:'A fast, simple, and completely free way to learn with flashcards.' },
  { chip:'Languages',
    icon:'translate',
    headline:'Learn languages',
    accentText:'faster every day.',
    lead:'Review vocabulary and grammar with small Sets — flip cards until they become second nature',
//    from: '#6b3fa0',
//    to: '#9b59b6',
//    accent: '#ead7ff',
     from: '#4b2416',
     to: '#7a3e1d',
     accent: '#ffd4aa',
    q:'What does "Aprender" mean?',
    a:'To learn (Spanish verb).' },
  { chip:'Science',
    icon:'science',
    headline:'Master science',
    accentText:'in just minutes.',
    lead:'Formulas, laws, and concepts — packed into easy-to-review flashcards.',
//    from: '#0f766e',
//    to: '#0e9f6e',
//    accent: '#b7f7df',
    from: '#4b2416',
    to: '#7a3e1d',
    accent: '#ffd4aa',
    q: 'What is the formula for force?',
    a: 'F = m × a (mass times acceleration).'
  },
  { chip: 'History',
    icon: 'history_edu',
    headline: 'Study history',
    accentText: 'easily and effectively.',
    lead: 'Important dates and events — organized into separate Decks for each period.',
//    from: '#8b4513',
//    to: '#b45309',
//    accent: '#ffd8aa',
    from: '#4b2416',
    to: '#7a3e1d',
    accent: '#ffd4aa',
    q: 'In what year was Vietnam reunified?',
    a: '1975.'
 },
 {
    chip: 'Mathematics',
    icon: 'calculate',
    headline: 'Master mathematics',
    accentText: 'step by step.',
    lead: 'Turn every formula and problem type into a flashcard and practice until it becomes automatic.',
//    from: '#2563eb',
//    to: '#0891b2',
//    accent: '#c7ebff',
    from: '#4b2416',
    to: '#7a3e1d',
    accent: '#ffd4aa',
    q: 'What is the derivative of x²?',
    a: '2x.'
    },
];

const heroBg = document.getElementById('heroBg');
const heroDots = document.getElementById('heroDots');
const heroChip = document.getElementById('heroChip');
const heroHeadline = document.getElementById('heroHeadline');
const heroAccent = document.getElementById('heroAccent');
const heroLead = document.getElementById('heroLead');
const heroQ = document.getElementById('heroQ');
const heroA = document.getElementById('heroA');
const heroBack = document.getElementById('heroBack');
const heroLive = document.getElementById('heroLiveRegion');
const heroCard = document.getElementById('heroCard');
const heroVisual = document.getElementById('heroVisual');
const heroSection = document.getElementById('top');


const layerA = document.createElement('div');
const layerB = document.createElement('div');
layerA.className = 'hero-slide is-active';
layerB.className = 'hero-slide';
layerA.style.background = `linear-gradient(135deg, ${heroSlides[0].from}, ${heroSlides[0].to})`;
heroBg.append(layerA, layerB);
let frontLayer = layerA, backLayer = layerB;

heroSlides.forEach((s, i) => {
  const dot = document.createElement('button');
  dot.className = 'hero-dot' + (i === 0 ? ' is-active' : '');
  dot.type = 'button';
  dot.setAttribute('aria-label', 'View topic: ' + s.chip);
  dot.addEventListener('click', () => goToSlide(i));
  heroDots.appendChild(dot);
});

let heroIndex = 0;
let heroTimer = null;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function paintSlide(i) {
  const s = heroSlides[i];
  backLayer.style.background = `linear-gradient(135deg, ${s.from}, ${s.to})`;
  backLayer.classList.add('is-active');
  frontLayer.classList.remove('is-active');
  [frontLayer, backLayer] = [backLayer, frontLayer];

  heroChip.innerHTML = `<span class="material-symbols-outlined">${s.icon}</span>${s.chip}`;
  heroHeadline.childNodes[0].textContent = s.headline;
  heroAccent.textContent = s.accentText;
  heroAccent.style.color = s.accent;
  heroLead.textContent = s.lead;
  heroQ.textContent = s.q;
  heroA.textContent = s.a;
  heroBack.style.background = `linear-gradient(135deg, ${s.from}, ${s.to})`;
  heroCard.classList.remove('flipped');
  heroDots.querySelectorAll('.hero-dot').forEach((d, di) =>
  d.classList.toggle('is-active', di === i)
  );
  heroLive.textContent = 'Currently showing topic: ' + s.chip;
}

function goToSlide(i) {
  heroIndex = (i + heroSlides.length) % heroSlides.length;
  paintSlide(heroIndex);
  restartAutoplay();
}
function nextSlide() { goToSlide(heroIndex + 1); }
function prevSlide() { goToSlide(heroIndex - 1); }

function restartAutoplay() {
  if (heroTimer) clearInterval(heroTimer);
  if (prefersReduced) return;
  heroTimer = setInterval(nextSlide, 3000);
}
restartAutoplay();

document.getElementById('heroPrev').addEventListener('click', prevSlide);
document.getElementById('heroNext').addEventListener('click', nextSlide);


heroSection.addEventListener('mouseenter', () => { if (heroTimer) clearInterval(heroTimer); });
heroSection.addEventListener('mouseleave', restartAutoplay);
heroSection.setAttribute('tabindex', '-1');
heroSection.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextSlide();
  if (e.key === 'ArrowLeft') prevSlide();
});


heroCard.addEventListener('click', () => heroCard.classList.toggle('flipped'));


if (window.matchMedia('(pointer: fine)').matches && !prefersReduced) {
  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroVisual.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    heroVisual.style.transform = `perspective(1000px) rotateY(${px * 10}deg) rotateX(${py * -10}deg)`;
  });
  heroSection.addEventListener('mouseleave', () => {
    heroVisual.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
  });
}


const ctaButtons = [
  'navLoginBtn',
  'navSignupBtn',
  'heroSignupBtn',
  'finalCtaSignupBtn'
];

ctaButtons.forEach(btnId => {
  const btn = document.getElementById(btnId);
  if (btn) {
    // href đã để trống — bạn tự thêm URL vào trong HTML
    // Ví dụ: href="/app/login" hoặc href="https://app.example.com/signup"
  }
});


const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));
