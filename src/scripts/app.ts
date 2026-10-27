import { APP_CATEGORIES } from '../data/categories';
import { APP_QUESTIONS } from '../data/questions';
import type { Category, FlashcardItem, UserState } from '../types/flashcards';

// Preserve original index on each card so shuffling does not corrupt studied/favorite keys
APP_CATEGORIES.forEach((cat) => {
  cat.cards.forEach((card, idx) => {
    if (card.originalIndex === undefined) {
      card.originalIndex = idx;
    }
  });
});

function getCardKey(catId: string, card: FlashcardItem, fallbackIdx: number): string {
  const realIdx = card.originalIndex !== undefined ? card.originalIndex : fallbackIdx;
  return `${catId}_${realIdx}`;
}

// State
let currentCategoryId: string = APP_CATEGORIES[0].id;
let currentCategoryMode: 'grid' | 'study' = 'grid';
let carouselCardIndex: number = 0;
let simuladoFilterMode: 'all' | 'pending' | 'answered' = 'all';

// User progress state (saved to localStorage)
const STORAGE_KEY = 'aws_flashcards_state_v1';
let userState: UserState = {
  studiedCards: {},    // { 'catId_cardIdx': true }
  favoriteCards: {},   // { 'catId_cardIdx': true }
  theme: 'dark',
  simuladoAnswers: {}, // { qId: selectedOptionIdx }
  simuladoCompleted: false,
  simuladoTimeSeconds: 0
};

// Load state from localStorage
function loadSavedState(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      userState = { ...userState, ...parsed };
    }
  } catch (e) {
    console.warn('Could not load localStorage', e);
  }
  // Apply theme
  document.documentElement.setAttribute('data-theme', userState.theme || 'dark');
  updateHeaderCounts();
}

function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
  } catch (e) {
    console.warn('Could not save state', e);
  }
  updateHeaderCounts();
}

function updateHeaderCounts(): void {
  const favCount = Object.keys(userState.favoriteCards).filter(k => userState.favoriteCards[k]).length;
  const favBadge = document.getElementById('fav-count-badge');
  if (favBadge) favBadge.textContent = String(favCount);
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme');
  const next: 'dark' | 'light' = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  userState.theme = next;
  saveState();
}

function closeSidebarMobile(): void {
  document.getElementById('app-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');
}

function toggleSidebar(e?: Event): void {
  if (e) e.stopPropagation();
  const sb = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sb) {
    const isOpen = sb.classList.toggle('open');
    if (backdrop) {
      backdrop.classList.toggle('open', isOpen);
    }
    if (isOpen) {
      setTimeout(() => {
        const activeEl = document.getElementById(`cat-nav-${currentCategoryId}`);
        activeEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 60);
    }
  }
}

// Close sidebar on mobile when clicking outside
document.addEventListener('click', (e: MouseEvent) => {
  const sb = document.getElementById('app-sidebar');
  const target = e.target as HTMLElement | null;
  if (sb && window.innerWidth <= 960 && sb.classList.contains('open')) {
    if (
      target &&
      !sb.contains(target) &&
      !target.closest('.mobile-menu-btn') &&
      !target.closest('#nav-btn-categories') &&
      !target.closest('.mobile-cat-picker-btn')
    ) {
      closeSidebarMobile();
    }
  }
});

// Reset instantâneo de todos os scrollers/ancestrais para o topo
function resetViewport(): void {
  const targets: (Element | null)[] = [
    document.getElementById('main-content'),
    document.querySelector('.app-layout'),
    document.body,
    document.scrollingElement
  ];
  targets.forEach(el => {
    if (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  });
}

// Navigation Tabs
function setNavTab(activeTab: 'categories' | 'allcards' | 'simulado' | 'favorites'): void {
  document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-container').forEach(view => view.classList.remove('active'));

  resetViewport();
  
  if (activeTab === 'categories') {
    document.getElementById('nav-btn-categories')?.classList.add('active');
    document.getElementById('view-category')?.classList.add('active');
  } else if (activeTab === 'allcards') {
    document.getElementById('nav-btn-allcards')?.classList.add('active');
    document.getElementById('view-allcards')?.classList.add('active');
    closeSidebarMobile();
    renderAllCards();
  } else if (activeTab === 'simulado') {
    document.getElementById('nav-btn-simulado')?.classList.add('active');
    document.getElementById('view-simulado')?.classList.add('active');
    closeSidebarMobile();
    initSimulado();
  } else if (activeTab === 'favorites') {
    document.getElementById('nav-btn-favorites')?.classList.add('active');
    document.getElementById('view-favorites')?.classList.add('active');
    closeSidebarMobile();
    renderFavorites();
  }

  requestAnimationFrame(resetViewport);
}

function navigateToCategoriesView(): void {
  const isAlreadyCategoryView = document.getElementById('view-category')?.classList.contains('active');
  setNavTab('categories');
  if (window.innerWidth <= 960) {
    if (isAlreadyCategoryView) {
      toggleSidebar();
    } else {
      closeSidebarMobile();
    }
  }
}

function navigateToAllCardsView(): void {
  setNavTab('allcards');
}

function navigateToSimuladoView(): void {
  setNavTab('simulado');
}

function navigateToFavoritesView(): void {
  setNavTab('favorites');
}

function navigateToDashboard(): void {
  setNavTab('categories');
  selectCategory(APP_CATEGORIES[0].id);
}

// -------------------------------------------------------------
// CATEGORIES & FLASHCARDS RENDERING
// -------------------------------------------------------------
function renderSidebarCategories(filterText: string = ''): void {
  const container = document.getElementById('sidebar-categories-container');
  if (!container) return;
  container.innerHTML = '';
  
  const query = filterText.toLowerCase().trim();

  // Group categories by domain
  const domains: Record<string, Category[]> = {};
  APP_CATEGORIES.forEach(cat => {
    if (!domains[cat.domain]) domains[cat.domain] = [];
    if (!query || cat.title.toLowerCase().includes(query) || cat.cards.some(c => c.front.toLowerCase().includes(query))) {
      domains[cat.domain].push(cat);
    }
  });

  let foundAny = false;
  Object.keys(domains).forEach(domainName => {
    const catList = domains[domainName];
    if (catList.length === 0) return;
    foundAny = true;

    const icon = catList[0].domainIcon || '📦';
    const groupTitle = document.createElement('div');
    groupTitle.className = 'domain-group-title';
    groupTitle.innerHTML = `<span>${icon}</span> ${domainName}`;
    container.appendChild(groupTitle);

    catList.forEach(cat => {
      const item = document.createElement('div');
      item.className = `category-nav-item ${cat.id === currentCategoryId ? 'active' : ''}`;
      item.id = `cat-nav-${cat.id}`;
      item.onclick = () => {
        selectCategory(cat.id);
        if (window.innerWidth <= 960) {
          closeSidebarMobile();
        }
      };

      // Check if all cards studied
      const allStudied = cat.cards.every((card, idx) => userState.studiedCards[getCardKey(cat.id, card, idx)]);

      item.innerHTML = `
        <span class="cat-name">${cat.title}</span>
        <div style="display: flex; align-items: center;">
          <span class="cat-badge">${cat.cardCount}</span>
          ${allStudied ? '<span class="cat-studied-dot" title="Todos cartões estudados"></span>' : ''}
        </div>
      `;
      container.appendChild(item);
    });
  });

  if (!foundAny) {
    const emptyDiv = document.createElement('div');
    emptyDiv.style.cssText = 'padding: 20px; text-align: center; color: var(--text-subtle); font-size: 0.88rem;';
    emptyDiv.textContent = `Nenhum assunto encontrado para "${filterText}".`;
    container.appendChild(emptyDiv);
  }

  renderMobileCategoryChips();
}

function formatShortCategoryTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^(Flashcards de Revisão|Flashcards Técnicos|Flashcards Completos|Flashcards|Conceitos|Módulo \d+|Módulo|Revisão)\s*[-:]\s*/i, '')
    .trim();
}

function renderMobileCategoryChips(): void {
  const currentIdx = APP_CATEGORIES.findIndex(c => c.id === currentCategoryId);
  const currentCat = APP_CATEGORIES[currentIdx >= 0 ? currentIdx : 0];
  const metaEl = document.getElementById('mobile-cat-picker-meta');
  if (metaEl && currentCat) {
    metaEl.textContent = `${currentCat.domainIcon || '📂'} Módulo ${(currentIdx >= 0 ? currentIdx : 0) + 1} de ${APP_CATEGORIES.length} • ${currentCat.domain}`;
  }
  const titleEl = document.getElementById('mobile-cat-picker-title');
  if (titleEl && currentCat) {
    titleEl.textContent = currentCat.title;
  }

  const chipsContainer = document.getElementById('mobile-category-chips');
  if (!chipsContainer) return;
  chipsContainer.innerHTML = '';

  APP_CATEGORIES.forEach((cat, idx) => {
    const isCurrent = cat.id === currentCategoryId;
    const allStudied = cat.cards.every((card, cIdx) => userState.studiedCards[getCardKey(cat.id, card, cIdx)]);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mobile-cat-chip ${isCurrent ? 'active' : ''}`;
    btn.id = `mobile-chip-${cat.id}`;
    btn.onclick = () => selectCategory(cat.id);

    const shortTitle = formatShortCategoryTitle(cat.title);
    btn.innerHTML = `
      <span class="chip-num">${idx + 1}</span>
      <span class="chip-label">${shortTitle}</span>
      ${allStudied ? '<span class="cat-studied-dot" title="Módulo concluído"></span>' : ''}
    `;
    chipsContainer.appendChild(btn);
  });
}

function filterCategoriesList(text: string): void {
  renderSidebarCategories(text);
}

function selectCategory(catId: string): void {
  setNavTab('categories');
  if (window.innerWidth <= 960) {
    closeSidebarMobile();
  }
  currentCategoryId = catId;
  carouselCardIndex = 0;
  
  // Update sidebar highlight
  document.querySelectorAll('.category-nav-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`cat-nav-${catId}`);
  if (activeEl) activeEl.classList.add('active');

  const category = APP_CATEGORIES.find(c => c.id === catId) || APP_CATEGORIES[0];

  // Update banner
  const domainEl = document.getElementById('cat-banner-domain');
  if (domainEl) domainEl.innerHTML = `${category.domainIcon} ${category.domain}`;
  const titleEl = document.getElementById('cat-banner-title');
  if (titleEl) titleEl.textContent = category.title;
  const countEl = document.getElementById('cat-banner-count');
  if (countEl) countEl.textContent = String(category.cardCount);
  const descEl = document.getElementById('cat-banner-desc');
  if (descEl) descEl.textContent = category.subtitle || 'Clique nos cartões para virar e conferir as respostas técnicas.';

  updateCategoryProgressStats(category);
  renderCategoryCards(category);
  updateCarouselCard();
  setCategoryDisplayMode(currentCategoryMode);
  renderMobileCategoryChips();

  setTimeout(() => {
    const activeChip = document.getElementById(`mobile-chip-${catId}`);
    const chips = activeChip?.parentElement;
    if (activeChip && chips) {
      const chipRect = activeChip.getBoundingClientRect();
      const boxRect = chips.getBoundingClientRect();
      chips.scrollTo({
        left: chips.scrollLeft + (chipRect.left - boxRect.left) - (chips.clientWidth - chipRect.width) / 2,
        behavior: 'smooth'
      });
    }
  }, 50);

  // Scroll to top of main content
  resetViewport();

  // Update footer navigation
  const idx = APP_CATEGORIES.findIndex(c => c.id === catId);
  const prevBtn = document.getElementById('btn-prev-category');
  const nextBtn = document.getElementById('btn-next-category');
  
  if (prevBtn) {
    if (idx > 0) {
      prevBtn.style.display = 'inline-flex';
      prevBtn.textContent = `← ${APP_CATEGORIES[idx - 1].title.substring(0, 24)}...`;
    } else {
      prevBtn.style.display = 'none';
    }
  }

  if (nextBtn) {
    if (idx < APP_CATEGORIES.length - 1) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.textContent = `${APP_CATEGORIES[idx + 1].title.substring(0, 24)}... →`;
    } else {
      nextBtn.style.display = 'none';
    }
  }
}

function navigateAdjacentCategory(offset: number): void {
  const idx = APP_CATEGORIES.findIndex(c => c.id === currentCategoryId);
  const nextIdx = idx + offset;
  if (nextIdx >= 0 && nextIdx < APP_CATEGORIES.length) {
    selectCategory(APP_CATEGORIES[nextIdx].id);
  }
}

function updateCategoryProgressStats(category: Category): void {
  let studied = 0;
  category.cards.forEach((card, idx) => {
    if (userState.studiedCards[getCardKey(category.id, card, idx)]) studied++;
  });
  const studiedCountEl = document.getElementById('cat-banner-studied-count');
  if (studiedCountEl) studiedCountEl.textContent = String(studied);
  const studiedTotalEl = document.getElementById('cat-banner-studied-total');
  if (studiedTotalEl) studiedTotalEl.textContent = String(category.cardCount);
  
  const pct = category.cardCount > 0 ? (studied / category.cardCount) * 100 : 0;
  const progressFillEl = document.getElementById('cat-banner-progress-fill');
  if (progressFillEl) progressFillEl.style.width = `${pct}%`;
}

function renderCategoryCards(category: Category): void {
  const container = document.getElementById('category-cards-grid');
  if (!container) return;
  container.innerHTML = '';

  category.cards.forEach((card, idx) => {
    const cardKey = getCardKey(category.id, card, idx);
    const isStudied = !!userState.studiedCards[cardKey];
    const isFav = !!userState.favoriteCards[cardKey];

    const wrap = document.createElement('div');
    wrap.className = 'card-wrapper';
    wrap.id = `card-wrap-${cardKey}`;

    wrap.innerHTML = `
      <div class="flashcard" id="card-${cardKey}" onclick="window.flipCardElement(this)">
        <!-- Front -->
        <div class="card-face card-face-front">
          <div class="card-top-row">
            <span class="card-badge">Card ${idx + 1}/${category.cardCount}</span>
            <div class="card-quick-actions" onclick="event.stopPropagation()">
              <button class="card-action-btn" onclick="window.speakCardByKey('${cardKey}', 'front')" title="Ouvir em voz alta">🔊</button>
              <button class="card-action-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${cardKey}', this)" title="Favoritar">⭐</button>
            </div>
          </div>
          <div class="card-main-content">
            <div class="card-title">${card.front}</div>
          </div>
          <div class="card-bottom-row">
            <span class="card-flip-hint">👆 Clique para virar</span>
            <button class="card-studied-toggle ${isStudied ? 'is-studied' : ''}" onclick="window.toggleStudied('${cardKey}', event, this)">
              ${isStudied ? '✓ Estudado' : 'Marcar Estudado'}
            </button>
          </div>
        </div>

        <!-- Back -->
        <div class="card-face card-face-back">
          <div class="card-top-row">
            <span class="card-badge">Resposta</span>
            <div class="card-quick-actions" onclick="event.stopPropagation()">
              <button class="card-action-btn" onclick="window.speakCardByKey('${cardKey}', 'back')" title="Ouvir em voz alta">🔊</button>
            </div>
          </div>
          <div class="card-main-content">
            <div class="card-definition">${card.back}</div>
          </div>
          <div class="card-bottom-row">
            <span class="card-flip-hint">👆 Clique para voltar</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(wrap);
  });
}

function flipCardElement(cardEl: HTMLElement): void {
  cardEl.classList.toggle('is-flipped');
}

function toggleFlipAllCurrentCards(): void {
  const cards = document.querySelectorAll('#category-cards-grid .flashcard');
  const anyUnflipped = Array.from(cards).some(c => !c.classList.contains('is-flipped'));
  cards.forEach(c => {
    if (anyUnflipped) c.classList.add('is-flipped');
    else c.classList.remove('is-flipped');
  });
}

function setCategoryDisplayMode(mode: 'grid' | 'study'): void {
  currentCategoryMode = mode;
  const gridBtn = document.getElementById('btn-mode-grid');
  const studyBtn = document.getElementById('btn-mode-study');
  const gridCont = document.getElementById('category-cards-grid');
  const studyCont = document.getElementById('category-study-container');

  if (mode === 'grid') {
    gridBtn?.classList.add('btn-active');
    studyBtn?.classList.remove('btn-active');
    if (gridCont) gridCont.style.display = 'grid';
    studyCont?.classList.remove('active');
  } else {
    studyBtn?.classList.add('btn-active');
    gridBtn?.classList.remove('btn-active');
    if (gridCont) gridCont.style.display = 'none';
    studyCont?.classList.add('active');
    updateCarouselCard();
  }
}

function shuffleCurrentCategoryCards(): void {
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (!cat) return;
  
  // Shuffle array in-place (originalIndex is preserved on each card object)
  for (let i = cat.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cat.cards[i], cat.cards[j]] = [cat.cards[j], cat.cards[i]];
  }
  
  renderCategoryCards(cat);
  carouselCardIndex = 0;
  updateCarouselCard();
}

function markAllCurrentCategoryStudied(): void {
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (!cat) return;
  cat.cards.forEach((card, idx) => {
    userState.studiedCards[getCardKey(cat.id, card, idx)] = true;
  });
  saveState();
  updateCategoryProgressStats(cat);
  renderCategoryCards(cat);
  renderSidebarCategories((document.getElementById('category-search-input') as HTMLInputElement | null)?.value || '');
}

function toggleStudied(cardKey: string, event?: Event, btnEl?: HTMLElement | null): void {
  if (event) event.stopPropagation();
  userState.studiedCards[cardKey] = !userState.studiedCards[cardKey];
  saveState();
  
  const isStudied = !!userState.studiedCards[cardKey];
  if (btnEl) {
    if (isStudied) {
      btnEl.classList.add('is-studied');
      btnEl.textContent = '✓ Estudado';
    } else {
      btnEl.classList.remove('is-studied');
      btnEl.textContent = btnEl.id === 'carousel-btn-studied' ? '✓ Marcar como Estudado' : 'Marcar Estudado';
    }
  }
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (cat) {
    updateCategoryProgressStats(cat);
    renderSidebarCategories((document.getElementById('category-search-input') as HTMLInputElement | null)?.value || '');
  }
}

function toggleFavorite(cardKey: string, btnEl?: HTMLElement | null): void {
  userState.favoriteCards[cardKey] = !userState.favoriteCards[cardKey];
  saveState();
  const isFav = !!userState.favoriteCards[cardKey];
  if (btnEl) {
    if (isFav) btnEl.classList.add('active');
    else btnEl.classList.remove('active');
  }
}

// -------------------------------------------------------------
// CAROUSEL STUDY MODE FUNCTIONS
// -------------------------------------------------------------
function updateCarouselCard(): void {
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (!cat || cat.cards.length === 0) return;

  if (carouselCardIndex >= cat.cards.length) carouselCardIndex = 0;
  if (carouselCardIndex < 0) carouselCardIndex = cat.cards.length - 1;

  const card = cat.cards[carouselCardIndex];
  const cardKey = getCardKey(cat.id, card, carouselCardIndex);
  const isStudied = !!userState.studiedCards[cardKey];
  const isFav = !!userState.favoriteCards[cardKey];

  const cardEl = document.getElementById('carousel-flashcard');
  cardEl?.classList.remove('is-flipped');

  const badgeFront = document.getElementById('carousel-badge-front');
  if (badgeFront) badgeFront.textContent = `Card ${carouselCardIndex + 1} de ${cat.cards.length}`;
  const titleEl = document.getElementById('carousel-title');
  if (titleEl) titleEl.innerHTML = card.front;
  const defEl = document.getElementById('carousel-def');
  if (defEl) defEl.innerHTML = card.back;
  const counterEl = document.getElementById('carousel-counter');
  if (counterEl) counterEl.textContent = `${carouselCardIndex + 1} / ${cat.cards.length}`;

  const favBtn = document.getElementById('carousel-btn-fav');
  if (favBtn) {
    if (isFav) favBtn.classList.add('active');
    else favBtn.classList.remove('active');
  }

  const studiedBtn = document.getElementById('carousel-btn-studied');
  if (studiedBtn) {
    if (isStudied) {
      studiedBtn.classList.add('is-studied');
      studiedBtn.textContent = '✓ Estudado';
    } else {
      studiedBtn.classList.remove('is-studied');
      studiedBtn.textContent = '✓ Marcar como Estudado';
    }
  }

  const prevBtn = document.getElementById('carousel-btn-prev') as HTMLButtonElement | null;
  if (prevBtn) prevBtn.disabled = (carouselCardIndex === 0);
  const nextBtn = document.getElementById('carousel-btn-next') as HTMLButtonElement | null;
  if (nextBtn) nextBtn.disabled = (carouselCardIndex === cat.cards.length - 1);
}

function flipCarouselCard(): void {
  const el = document.getElementById('carousel-flashcard');
  el?.classList.toggle('is-flipped');
}

function carouselPrevCard(): void {
  if (carouselCardIndex > 0) {
    carouselCardIndex--;
    updateCarouselCard();
  }
}

function carouselNextCard(): void {
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (cat && carouselCardIndex < cat.cards.length - 1) {
    carouselCardIndex++;
    updateCarouselCard();
  }
}

function toggleFavoriteCurrentCarousel(): void {
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (!cat) return;
  const card = cat.cards[carouselCardIndex];
  const cardKey = getCardKey(cat.id, card, carouselCardIndex);
  toggleFavorite(cardKey, document.getElementById('carousel-btn-fav'));
  renderCategoryCards(cat);
}

function toggleStudiedCurrentCarousel(e?: Event): void {
  if (e) e.stopPropagation();
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (!cat) return;
  const card = cat.cards[carouselCardIndex];
  const cardKey = getCardKey(cat.id, card, carouselCardIndex);
  toggleStudied(cardKey, e, document.getElementById('carousel-btn-studied'));
  renderCategoryCards(cat);
}

function speakCurrentCarouselCard(side: 'front' | 'back'): void {
  const cat = APP_CATEGORIES.find(c => c.id === currentCategoryId);
  if (!cat) return;
  const card = cat.cards[carouselCardIndex];
  const text = side === 'front' ? card.front : card.back;
  speakText(text);
}

// Keyboard navigation in study mode
window.addEventListener('keydown', (e: KeyboardEvent) => {
  const viewCat = document.getElementById('view-category');
  if (!viewCat || !viewCat.classList.contains('active')) return;
  if (currentCategoryMode !== 'study') return;
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    flipCarouselCard();
  } else if (e.code === 'ArrowLeft') {
    carouselPrevCard();
  } else if (e.code === 'ArrowRight') {
    carouselNextCard();
  } else if (e.key === 'm' || e.key === 'M') {
    toggleStudiedCurrentCarousel();
  } else if (e.key === 's' || e.key === 'S') {
    toggleFavoriteCurrentCarousel();
  }
});

// -------------------------------------------------------------
// ALL CARDS SEARCH VIEW
// -------------------------------------------------------------
function renderAllCards(): void {
  filterAllCards();
}

function filterAllCards(): void {
  const searchInput = document.getElementById('global-search-input') as HTMLInputElement | null;
  const domainSelect = document.getElementById('global-domain-filter') as HTMLSelectElement | null;
  const statusSelect = document.getElementById('global-status-filter') as HTMLSelectElement | null;

  const query = (searchInput?.value || '').toLowerCase().trim();
  const domainFilter = domainSelect?.value || 'all';
  const statusFilter = statusSelect?.value || 'all';

  const container = document.getElementById('all-cards-grid');
  if (!container) return;
  container.innerHTML = '';

  const matches: Array<{
    cat: Category;
    card: FlashcardItem;
    idx: number;
    cardKey: string;
    isStudied: boolean;
    isFav: boolean;
  }> = [];

  APP_CATEGORIES.forEach(cat => {
    if (domainFilter !== 'all' && cat.domain !== domainFilter) return;

    cat.cards.forEach((card, idx) => {
      const cardKey = getCardKey(cat.id, card, idx);
      const isStudied = !!userState.studiedCards[cardKey];
      const isFav = !!userState.favoriteCards[cardKey];

      if (statusFilter === 'studied' && !isStudied) return;
      if (statusFilter === 'pending' && isStudied) return;
      if (statusFilter === 'favorites' && !isFav) return;

      if (query) {
        const inFront = card.front.toLowerCase().includes(query);
        const inBack = card.back.toLowerCase().includes(query);
        const inCat = cat.title.toLowerCase().includes(query);
        if (!inFront && !inBack && !inCat) return;
      }

      matches.push({ cat, card, idx, cardKey, isStudied, isFav });
    });
  });

  const infoEl = document.getElementById('global-search-results-info');
  if (infoEl) {
    infoEl.textContent = `Encontrados ${matches.length} de 246 cartões`;
  }

  if (matches.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <h3>Nenhum flashcard encontrado com os filtros atuais.</h3>
        <p style="margin-top: 8px;">Tente ajustar o termo de pesquisa ou selecione outro domínio.</p>
      </div>
    `;
    return;
  }

  matches.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = 'card-wrapper';
    wrap.innerHTML = `
      <div class="flashcard" onclick="window.flipCardElement(this)">
        <div class="card-face card-face-front">
          <div class="card-top-row">
            <span class="card-badge">${item.cat.title}</span>
            <div class="card-quick-actions" onclick="event.stopPropagation()">
              <button class="card-action-btn" onclick="window.speakCardByKey('${item.cardKey}', 'front')" title="Ouvir">🔊</button>
              <button class="card-action-btn ${item.isFav ? 'active' : ''}" onclick="window.toggleFavorite('${item.cardKey}', this)" title="Favoritar">⭐</button>
            </div>
          </div>
          <div class="card-main-content">
            <div class="card-title">${item.card.front}</div>
          </div>
          <div class="card-bottom-row">
            <span class="card-flip-hint">👆 Clique para virar</span>
            <button class="card-studied-toggle ${item.isStudied ? 'is-studied' : ''}" onclick="window.toggleStudied('${item.cardKey}', event, this)">
              ${item.isStudied ? '✓ Estudado' : 'Marcar Estudado'}
            </button>
          </div>
        </div>
        <div class="card-face card-face-back">
          <div class="card-top-row">
            <span class="card-badge">Definição</span>
            <div class="card-quick-actions" onclick="event.stopPropagation()">
              <button class="card-action-btn" onclick="window.speakCardByKey('${item.cardKey}', 'back')" title="Ouvir">🔊</button>
            </div>
          </div>
          <div class="card-main-content">
            <div class="card-definition">${item.card.back}</div>
          </div>
          <div class="card-bottom-row">
            <span class="card-flip-hint">👆 Clique para voltar</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(wrap);
  });
}

// -------------------------------------------------------------
// FAVORITES VIEW
// -------------------------------------------------------------
function renderFavorites(): void {
  const container = document.getElementById('favorites-cards-grid');
  if (!container) return;
  container.innerHTML = '';

  const favs: Array<{
    cat: Category;
    card: FlashcardItem;
    idx: number;
    cardKey: string;
  }> = [];

  APP_CATEGORIES.forEach(cat => {
    cat.cards.forEach((card, idx) => {
      const cardKey = getCardKey(cat.id, card, idx);
      if (userState.favoriteCards[cardKey]) {
        favs.push({ cat, card, idx, cardKey });
      }
    });
  });

  if (favs.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <h3>Você ainda não marcou nenhum flashcard com estrela ⭐.</h3>
        <p style="margin-top: 8px;">Nos modos de estudo ou por categoria, clique na estrelinha de qualquer cartão para guardá-lo aqui.</p>
      </div>
    `;
    return;
  }

  favs.forEach(item => {
    const isStudied = !!userState.studiedCards[item.cardKey];
    const wrap = document.createElement('div');
    wrap.className = 'card-wrapper';
    wrap.innerHTML = `
      <div class="flashcard" onclick="window.flipCardElement(this)">
        <div class="card-face card-face-front">
          <div class="card-top-row">
            <span class="card-badge">${item.cat.title}</span>
            <div class="card-quick-actions" onclick="event.stopPropagation()">
              <button class="card-action-btn active" onclick="window.toggleFavorite('${item.cardKey}', this); window.renderFavorites();" title="Remover dos favoritos">⭐</button>
            </div>
          </div>
          <div class="card-main-content">
            <div class="card-title">${item.card.front}</div>
          </div>
          <div class="card-bottom-row">
            <span class="card-flip-hint">👆 Clique para virar</span>
            <button class="card-studied-toggle ${isStudied ? 'is-studied' : ''}" onclick="window.toggleStudied('${item.cardKey}', event, this)">
              ${isStudied ? '✓ Estudado' : 'Marcar Estudado'}
            </button>
          </div>
        </div>
        <div class="card-face card-face-back">
          <div class="card-top-row">
            <span class="card-badge">Resposta</span>
          </div>
          <div class="card-main-content">
            <div class="card-definition">${item.card.back}</div>
          </div>
          <div class="card-bottom-row">
            <span class="card-flip-hint">👆 Clique para voltar</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(wrap);
  });
}

// -------------------------------------------------------------
// TEXT TO SPEECH (pt-BR)
// -------------------------------------------------------------
function speakCardByKey(cardKey: string, side: 'front' | 'back'): void {
  const parts = cardKey.split('_');
  const cardIdx = parseInt(parts.pop() || '0', 10);
  const catId = parts.join('_');
  const cat = APP_CATEGORIES.find(c => c.id === catId);
  if (cat) {
    const card = cat.cards.find((c, i) => (c.originalIndex !== undefined ? c.originalIndex : i) === cardIdx);
    if (card) {
      const text = side === 'front' ? card.front : card.back;
      speakText(text);
    }
  }
}

function speakText(rawText: string): void {
  if (!('speechSynthesis' in window)) {
    alert('Seu navegador não suporta síntese de voz.');
    return;
  }
  window.speechSynthesis.cancel(); // Stop any ongoing speech
  const clean = rawText.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

// -------------------------------------------------------------
// SIMULADO / EXAM SIMULATOR
// -------------------------------------------------------------
let timerInterval: ReturnType<typeof setInterval> | null = null;
let timerSeconds: number = 0;

function initSimulado(): void {
  if (userState.simuladoTimeSeconds && timerSeconds === 0) {
    timerSeconds = userState.simuladoTimeSeconds;
  }
  renderSimuladoQuestions();
  updateSimuladoProgress();

  if (!timerInterval && !userState.simuladoCompleted) {
    timerInterval = setInterval(() => {
      timerSeconds++;
      userState.simuladoTimeSeconds = timerSeconds;
      updateTimerDisplay();
    }, 1000);
  }
  updateTimerDisplay();

  if (userState.simuladoCompleted) {
    showSimuladoResults();
  }
}

function filterSimuladoView(mode: 'all' | 'pending' | 'answered'): void {
  simuladoFilterMode = mode;
  document.querySelectorAll('.sim-filter-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`sim-filter-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  renderSimuladoQuestions();
}

function updateTimerDisplay(): void {
  const min = Math.floor(timerSeconds / 60);
  const sec = timerSeconds % 60;
  const str = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  const el = document.getElementById('timer-text');
  if (el) el.textContent = str;
}

function renderSimuladoQuestions(): void {
  const container = document.getElementById('simulado-questions-list');
  if (!container) return;
  container.innerHTML = '';

  const letters = ['A', 'B', 'C', 'D'];

  APP_QUESTIONS.forEach((q, idx) => {
    const isAnswered = userState.simuladoAnswers[q.id] !== undefined;

    if (simuladoFilterMode === 'pending' && isAnswered) return;
    if (simuladoFilterMode === 'answered' && !isAnswered) return;

    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = `question-card-${q.id}`;

    const userAns = userState.simuladoAnswers[q.id];

    let optionsHtml = '';
    q.options.forEach((optText, optIdx) => {
      const isSelected = (userAns === optIdx);
      let extraClass = isSelected ? 'selected' : '';

      if (userState.simuladoCompleted) {
        if (optIdx === q.correct) extraClass += ' opt-correct';
        else if (isSelected && optIdx !== q.correct) extraClass += ' opt-incorrect';
      }

      optionsHtml += `
        <div class="q-option-item ${extraClass}" onclick="window.selectQuestionOption(${q.id}, ${optIdx})">
          <div class="q-opt-indicator">${letters[optIdx]}</div>
          <div class="q-opt-text">${optText}</div>
        </div>
      `;
    });

    let explanationHtml = '';
    if (userState.simuladoCompleted) {
      const isCorrect = (userAns === q.correct);
      explanationHtml = `
        <div class="q-explanation-box ${isCorrect ? '' : 'is-wrong'}">
          <div class="q-explanation-title">
            ${isCorrect ? '✅ Resposta Correta!' : '❌ Incorreto.'}
            <span>(Gabarito: Opção ${letters[q.correct]})</span>
          </div>
          <div>${q.explanation}</div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="q-header">
        <span class="q-number">Questão ${idx + 1} de ${APP_QUESTIONS.length}</span>
        <span class="q-cat-tag">🏷️ ${q.category}</span>
      </div>
      <div class="q-text">${q.question}</div>
      <div class="q-options-list" id="q-options-${q.id}">
        ${optionsHtml}
      </div>
      ${explanationHtml}
    `;
    container.appendChild(card);
  });

  if (container.children.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <h3>Nenhuma questão nesta visualização.</h3>
        <p style="margin-top: 8px;">Você respondeu a todas as questões ou não há itens pendentes!</p>
      </div>
    `;
  }
}

function selectQuestionOption(qId: number, optionIdx: number): void {
  if (userState.simuladoCompleted) return; // Locked after completion until retry

  userState.simuladoAnswers[qId] = optionIdx;
  saveState();

  // Update question options styling
  const qOptionsCont = document.getElementById(`q-options-${qId}`);
  if (qOptionsCont) {
    const items = qOptionsCont.querySelectorAll('.q-option-item');
    items.forEach((item, idx) => {
      if (idx === optionIdx) item.classList.add('selected');
      else item.classList.remove('selected');
    });
  }

  updateSimuladoProgress();

  // CHECK IF ALL QUESTIONS HAVE BEEN ANSWERED!
  const totalAnswered = Object.keys(userState.simuladoAnswers).length;
  if (totalAnswered === APP_QUESTIONS.length) {
    setTimeout(() => {
      checkAndFinishSimulado(false);
    }, 350);
  }
}

function updateSimuladoProgress(): void {
  const totalAnswered = Object.keys(userState.simuladoAnswers).length;
  const totalQ = APP_QUESTIONS.length;
  const pct = Math.round((totalAnswered / totalQ) * 100);

  const ansEl = document.getElementById('sim-answered-count');
  if (ansEl) ansEl.textContent = `${totalAnswered}/${totalQ}`;
  const pctEl = document.getElementById('sim-progress-percent');
  if (pctEl) pctEl.textContent = `${pct}%`;
  const pendEl = document.getElementById('sim-pending-count');
  if (pendEl) pendEl.textContent = `${totalQ - totalAnswered}`;
  const botEl = document.getElementById('bottom-bar-progress');
  if (botEl) botEl.textContent = `${totalAnswered}/${totalQ} respondidas (${pct}%)`;
}

function checkAndFinishSimulado(manualClick: boolean = false): void {
  const totalAnswered = Object.keys(userState.simuladoAnswers).length;
  const totalQ = APP_QUESTIONS.length;

  if (totalAnswered < totalQ && manualClick) {
    const pending = totalQ - totalAnswered;
    showModal(
      'Questões Incompletas',
      `Você respondeu ${totalAnswered} de ${totalQ} questões (${pending} restantes). Deseja finalizar mesmo assim e ver o seu resultado agora?`,
      () => {
        closeModal();
        finishSimuladoNow();
      }
    );
    return;
  }

  finishSimuladoNow();
}

function finishSimuladoNow(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  userState.simuladoCompleted = true;
  saveState();

  showSimuladoResults();
  renderSimuladoQuestions();

  // Smooth scroll to results
  document.getElementById('simulado-results-screen')?.scrollIntoView({ behavior: 'smooth' });
}

function showSimuladoResults(): void {
  let correct = 0;
  let wrong = 0;
  const totalQ = APP_QUESTIONS.length;

  // Domain accuracy breakdown
  const domainStats: Record<string, { total: number; correct: number }> = {};

  APP_QUESTIONS.forEach(q => {
    const domain = q.domain || 'Geral';
    if (!domainStats[domain]) domainStats[domain] = { total: 0, correct: 0 };
    domainStats[domain].total++;

    const userChoice = userState.simuladoAnswers[q.id];
    if (userChoice === q.correct) {
      correct++;
      domainStats[domain].correct++;
    } else {
      wrong++;
    }
  });

  const pct = Math.round((correct / totalQ) * 100);
  const isPass = pct >= 70;

  const screen = document.getElementById('simulado-results-screen');
  screen?.classList.add('active');

  const badge = document.getElementById('result-status-badge');
  if (badge) {
    if (isPass) {
      badge.className = 'result-badge-status pass';
      badge.textContent = 'APROVADO 🏆';
      triggerConfettiCelebration();
    } else {
      badge.className = 'result-badge-status fail';
      badge.textContent = 'PRECISA REVISAR 📚';
    }
  }

  const scoreDisplay = document.getElementById('result-score-display');
  if (scoreDisplay) scoreDisplay.innerHTML = `${correct}<span>/${totalQ}</span>`;
  const metricPct = document.getElementById('result-metric-percent');
  if (metricPct) metricPct.textContent = `${pct}%`;
  const metricCorrect = document.getElementById('result-metric-correct');
  if (metricCorrect) metricCorrect.textContent = String(correct);
  const metricWrong = document.getElementById('result-metric-wrong');
  if (metricWrong) metricWrong.textContent = String(wrong);

  const min = Math.floor(userState.simuladoTimeSeconds / 60);
  const sec = userState.simuladoTimeSeconds % 60;
  const metricTime = document.getElementById('result-metric-time');
  if (metricTime) metricTime.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  const feedback = document.getElementById('result-summary-feedback');
  if (feedback) {
    if (isPass) {
      feedback.textContent = `Excelente desempenho! Você atingiu ${pct}%, superando a nota de corte recomendada para exames da AWS (70%). Abaixo você confere o gabarito com a explicação detalhada de cada questão.`;
    } else {
      feedback.textContent = `Você alcançou ${pct}% de aproveitamento. A pontuação mínima para aprovação é 70%. Analise as explicações das questões abaixo e utilize os flashcards para reforçar os assuntos pendentes!`;
    }
  }

  // Render domain breakdown
  const domainContainer = document.getElementById('domain-breakdown-container');
  if (domainContainer) {
    let domainHtml = '<h3>📊 Desempenho por Domínio de Conhecimento:</h3>';
    Object.keys(domainStats).forEach(domName => {
      const s = domainStats[domName];
      const domPct = Math.round((s.correct / s.total) * 100);
      domainHtml += `
        <div class="domain-row">
          <span style="font-weight: 600;">${domName}</span>
          <div class="domain-progress-bar">
            <div class="domain-progress-fill" style="width: ${domPct}%; background: ${domPct >= 70 ? 'var(--success)' : 'var(--danger)'};"></div>
          </div>
          <span style="min-width: 65px; text-align: right; font-weight: 700;">${s.correct}/${s.total} (${domPct}%)</span>
        </div>
      `;
    });
    domainContainer.innerHTML = domainHtml;
  }

  const retryWrongBtn = document.getElementById('btn-retry-wrong');
  if (retryWrongBtn) {
    if (wrong > 0) retryWrongBtn.style.display = 'inline-flex';
    else retryWrongBtn.style.display = 'none';
  }
}

function scrollToReviewQuestions(): void {
  filterSimuladoView('all');
  setTimeout(() => {
    const qList = document.getElementById('simulado-questions-list');
    if (qList) qList.scrollIntoView({ behavior: 'smooth' });
  }, 50);
}

function restartFullSimulado(): void {
  showModal(
    'Refazer Simulado',
    'Tem certeza de que deseja zerar todas as respostas e reiniciar o simulado do zero?',
    () => {
      closeModal();
      userState.simuladoAnswers = {};
      userState.simuladoCompleted = false;
      userState.simuladoTimeSeconds = 0;
      timerSeconds = 0;
      saveState();

      document.getElementById('simulado-results-screen')?.classList.remove('active');
      initSimulado();
      document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  );
}

function retryOnlyWrongQuestions(): void {
  const newAnswers: Record<number, number> = {};
  APP_QUESTIONS.forEach(q => {
    if (userState.simuladoAnswers[q.id] === q.correct) {
      newAnswers[q.id] = q.correct;
    }
  });
  userState.simuladoAnswers = newAnswers;
  userState.simuladoCompleted = false;
  saveState();

  document.getElementById('simulado-results-screen')?.classList.remove('active');
  initSimulado();
  filterSimuladoView('pending');
  document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function confirmResetSimulado(): void {
  restartFullSimulado();
}

// Modal Helpers
function showModal(title: string, msg: string, onConfirm: () => void): void {
  const titleEl = document.getElementById('modal-title');
  if (titleEl) titleEl.textContent = title;
  const msgEl = document.getElementById('modal-message');
  if (msgEl) msgEl.textContent = msg;
  const confirmBtn = document.getElementById('modal-confirm-btn');
  if (confirmBtn) confirmBtn.onclick = onConfirm;
  document.getElementById('generic-modal')?.classList.add('active');
}

function closeModal(): void {
  document.getElementById('generic-modal')?.classList.remove('active');
}

function resetAllProgressConfirm(): void {
  showModal(
    'Resetar Todo o Progresso',
    'Deseja limpar todos os cartões estudados, favoritos e histórico do simulado? Esta ação reiniciará todo o aplicativo.',
    () => {
      localStorage.removeItem(STORAGE_KEY);
      userState = {
        studiedCards: {},
        favoriteCards: {},
        theme: 'dark',
        simuladoAnswers: {},
        simuladoCompleted: false,
        simuladoTimeSeconds: 0
      };
      location.reload();
    }
  );
}

// Lightweight Pure Canvas Confetti
function triggerConfettiCelebration(): void {
  const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.style.display = 'block';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pieces: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    vx: number;
    vy: number;
    rot: number;
    rotSpeed: number;
  }> = [];
  const colors = ['#ff9900', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#ffffff'];

  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 3,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10
    });
  }

  let frames = 0;
  function animate(): void {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frames++;
    if (frames < 240) {
      requestAnimationFrame(animate);
    } else {
      canvas.style.display = 'none';
    }
  }
  animate();
}

// Expose handlers on window for inline event attributes and dynamic HTML
declare global {
  interface Window {
    navigateToDashboard: typeof navigateToDashboard;
    toggleSidebar: typeof toggleSidebar;
    navigateToCategoriesView: typeof navigateToCategoriesView;
    navigateToAllCardsView: typeof navigateToAllCardsView;
    navigateToSimuladoView: typeof navigateToSimuladoView;
    navigateToFavoritesView: typeof navigateToFavoritesView;
    toggleTheme: typeof toggleTheme;
    resetAllProgressConfirm: typeof resetAllProgressConfirm;
    filterCategoriesList: typeof filterCategoriesList;
    setCategoryDisplayMode: typeof setCategoryDisplayMode;
    toggleFlipAllCurrentCards: typeof toggleFlipAllCurrentCards;
    shuffleCurrentCategoryCards: typeof shuffleCurrentCategoryCards;
    markAllCurrentCategoryStudied: typeof markAllCurrentCategoryStudied;
    flipCarouselCard: typeof flipCarouselCard;
    speakCurrentCarouselCard: typeof speakCurrentCarouselCard;
    toggleFavoriteCurrentCarousel: typeof toggleFavoriteCurrentCarousel;
    toggleStudiedCurrentCarousel: typeof toggleStudiedCurrentCarousel;
    carouselPrevCard: typeof carouselPrevCard;
    carouselNextCard: typeof carouselNextCard;
    navigateAdjacentCategory: typeof navigateAdjacentCategory;
    filterAllCards: typeof filterAllCards;
    restartFullSimulado: typeof restartFullSimulado;
    retryOnlyWrongQuestions: typeof retryOnlyWrongQuestions;
    scrollToReviewQuestions: typeof scrollToReviewQuestions;
    filterSimuladoView: typeof filterSimuladoView;
    confirmResetSimulado: typeof confirmResetSimulado;
    checkAndFinishSimulado: typeof checkAndFinishSimulado;
    closeModal: typeof closeModal;
    flipCardElement: typeof flipCardElement;
    speakCardByKey: typeof speakCardByKey;
    toggleFavorite: typeof toggleFavorite;
    toggleStudied: typeof toggleStudied;
    renderFavorites: typeof renderFavorites;
    selectQuestionOption: typeof selectQuestionOption;
  }
}

window.navigateToDashboard = navigateToDashboard;
window.toggleSidebar = toggleSidebar;
window.navigateToCategoriesView = navigateToCategoriesView;
window.navigateToAllCardsView = navigateToAllCardsView;
window.navigateToSimuladoView = navigateToSimuladoView;
window.navigateToFavoritesView = navigateToFavoritesView;
window.toggleTheme = toggleTheme;
window.resetAllProgressConfirm = resetAllProgressConfirm;
window.filterCategoriesList = filterCategoriesList;
window.setCategoryDisplayMode = setCategoryDisplayMode;
window.toggleFlipAllCurrentCards = toggleFlipAllCurrentCards;
window.shuffleCurrentCategoryCards = shuffleCurrentCategoryCards;
window.markAllCurrentCategoryStudied = markAllCurrentCategoryStudied;
window.flipCarouselCard = flipCarouselCard;
window.speakCurrentCarouselCard = speakCurrentCarouselCard;
window.toggleFavoriteCurrentCarousel = toggleFavoriteCurrentCarousel;
window.toggleStudiedCurrentCarousel = toggleStudiedCurrentCarousel;
window.carouselPrevCard = carouselPrevCard;
window.carouselNextCard = carouselNextCard;
window.navigateAdjacentCategory = navigateAdjacentCategory;
window.filterAllCards = filterAllCards;
window.restartFullSimulado = restartFullSimulado;
window.retryOnlyWrongQuestions = retryOnlyWrongQuestions;
window.scrollToReviewQuestions = scrollToReviewQuestions;
window.filterSimuladoView = filterSimuladoView;
window.confirmResetSimulado = confirmResetSimulado;
window.checkAndFinishSimulado = checkAndFinishSimulado;
window.closeModal = closeModal;
window.flipCardElement = flipCardElement;
window.speakCardByKey = speakCardByKey;
window.toggleFavorite = toggleFavorite;
window.toggleStudied = toggleStudied;
window.renderFavorites = renderFavorites;
window.selectQuestionOption = selectQuestionOption;

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
function initApp(): void {
  loadSavedState();
  renderSidebarCategories();
  selectCategory(currentCategoryId);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
