/* 
=============================================================================
  NEXUS GAMING - GAMES DATABASE & CATALOG CONTROLLER
  File: js/games.js
=============================================================================
  HOW TO EDIT GAME LIST:
  To add, remove, or modify games, update the `games` array below.
  Categories: "Popular", "New Games", "Sports", "Live Casino", "Slots", "Crash Games", "Card Games"
=============================================================================
*/

// Central Game Database Array
const games = [
  {
    id: 1,
    name: "Aviator Rocket Crash",
    category: "Crash Games",
    image: "images/games/galactic-orbit.svg",
    description: "High-speed multiplier game. Cash out before the rocket flies away!",
    badge: "Popular",
    rating: "4.9",
    playUrl: "#play-aviator"
  },
  {
    id: 2,
    name: "IPL Cricket Stars 2026",
    category: "Sports",
    image: "images/games/stadium-clash.svg",
    description: "Live T20 cricket simulator with real match physics and live odds preview.",
    badge: "Live Games",
    rating: "4.9",
    playUrl: "#play-cricket"
  },
  {
    id: 3,
    name: "Royal Teen Patti 3D",
    category: "Card Games",
    image: "images/games/mystique-reels.svg",
    description: "Classic Indian 3-card poker with real-time multiplayer tables.",
    badge: "Popular",
    rating: "4.8",
    playUrl: "#play-teenpatti"
  },
  {
    id: 4,
    name: "Andar Bahar Live Dealer",
    category: "Live Casino",
    image: "images/games/live-dealer-roulette.svg",
    description: "Traditional fast-paced card matching game hosted by live dealers HD stream.",
    badge: "Popular",
    rating: "4.9",
    playUrl: "#play-andarbahar"
  },
  {
    id: 5,
    name: "Lightning Roulette 3D",
    category: "Live Casino",
    image: "images/games/live-dealer-roulette.svg",
    description: "European roulette enhanced with random lucky number multipliers up to 500x.",
    badge: "New Games",
    rating: "4.8",
    playUrl: "#play-roulette"
  },
  {
    id: 6,
    name: "Dragon Tiger Arena",
    category: "Card Games",
    image: "images/games/shadow-blade.svg",
    description: "Ultra-fast two-card game. Bet on Dragon or Tiger for instant rounds.",
    badge: "Popular",
    rating: "4.7",
    playUrl: "#play-dragontiger"
  },
  {
    id: 7,
    name: "Mega Slot Bonanza 777",
    category: "Slots",
    image: "images/games/mystique-reels.svg",
    description: "5-reel jackpot video slot with scatter symbols, free spins, and wild multipliers.",
    badge: "New Games",
    rating: "4.8",
    playUrl: "#play-slots"
  },
  {
    id: 8,
    name: "Cyber Pulse 2099",
    category: "Crash Games",
    image: "images/games/cyber-pulse.svg",
    description: "Futuristic synthwave runner challenge with bonus multiplier checkpoints.",
    badge: "Popular",
    rating: "4.9",
    playUrl: "#play-cyberpulse"
  },
  {
    id: 9,
    name: "Neon Racers Velocity",
    category: "Crash Games",
    image: "images/games/neon-racers.svg",
    description: "Multiplayer neon street racing with turbo boosts and customized supercars.",
    badge: "New Games",
    rating: "4.8",
    playUrl: "#play-neonracers"
  },
  {
    id: 10,
    name: "Premier Football League",
    category: "Sports",
    image: "images/games/stadium-clash.svg",
    description: "Real-time European football match simulator with in-play betting options.",
    badge: "Live Games",
    rating: "4.9",
    playUrl: "#play-football"
  },
  {
    id: 11,
    name: "Super Speed Baccarat",
    category: "Live Casino",
    image: "images/games/live-dealer-roulette.svg",
    description: "Rapid 15-second baccarat rounds with player, banker, and tie side bets.",
    badge: "New Games",
    rating: "4.7",
    playUrl: "#play-baccarat"
  },
  {
    id: 12,
    name: "Apex Rumble Arena",
    category: "Crash Games",
    image: "images/games/apex-rumble.svg",
    description: "Tactical combat arena where speed and strategy win instant prizes.",
    badge: "Popular",
    rating: "4.8",
    playUrl: "#play-apex"
  }
];

// Helper: Generate HTML for a single game card
function createGameCard(game) {
  let badgeClass = 'badge-popular';
  if (game.badge === 'New Games') badgeClass = 'badge-new';
  if (game.badge === 'Live Games') badgeClass = 'badge-live';

  return `
    <article class="game-card" data-category="${game.category}" data-id="${game.id}">
      <div class="card-image-wrap">
        <img src="${game.image}" alt="${game.name} - Online Gaming Platform" loading="lazy" width="400" height="250">
        ${game.badge ? `<span class="card-badge ${badgeClass}">${game.badge}</span>` : ''}
      </div>
      <div class="card-content">
        <span class="card-category">${game.category}</span>
        <h3 class="card-title">${game.name}</h3>
        <p class="card-desc">${game.description}</p>
        <div class="card-footer">
          <div class="card-rating">
            <span>★</span>
            <span>${game.rating}</span>
          </div>
          <a href="https://wa.me/1234567890?text=Hello,%20I%20want%20to%20play%20${encodeURIComponent(game.name)}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp play-btn" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
            Play / Get ID
          </a>
        </div>
      </div>
    </article>
  `;
}

// Render Games Array into DOM Container
function renderGames(gameList, containerId = 'game-grid-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (gameList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <h3>No games match your selected category or search query</h3>
        <p style="margin-top: 0.5rem;">Try choosing another category tab above or clearing your search filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = gameList.map(game => createGameCard(game)).join('');
}

// Initialize Interactive Filter Tabs & Real-Time Search Bar
function initGameFilters() {
  const container = document.getElementById('game-grid-container');
  if (!container) return;

  let activeCategory = 'All';
  let searchQuery = '';

  const filterGames = () => {
    const filtered = games.filter(game => {
      const matchesCategory = (activeCategory === 'All') || (game.category === activeCategory) || (activeCategory === 'Popular' && game.badge === 'Popular');
      const matchesSearch = game.name.toLowerCase().includes(searchQuery) || game.description.toLowerCase().includes(searchQuery) || game.category.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
    renderGames(filtered);
  };

  // Category Tab Click Listeners
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.getAttribute('data-category');
      filterGames();
    });
  });

  // Search Bar Typing Listener
  const searchInput = document.getElementById('game-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterGames();
    });
  }
}

// Execute on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderGames(games);
  initGameFilters();
});
