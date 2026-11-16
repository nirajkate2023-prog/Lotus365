/*
=============================================================================
  LOTUS365 - BLOG INDEX
  File: js/blog.js
  Renders the featured story, category filters, search and post grid.
=============================================================================
*/
(function () {
  'use strict';

  var LB = window.LotusBlog;
  if (!LB) return;

  var PAGE_SIZE = 6;
  var PALETTE = [
    'linear-gradient(135deg, #0f3d2e, #00e676)',
    'linear-gradient(135deg, #10263f, #00b0ff)',
    'linear-gradient(135deg, #2a1636, #7c4dff)',
    'linear-gradient(135deg, #3a1c0d, #ff9100)',
    'linear-gradient(135deg, #3a0f16, #ff3d00)'
  ];

  var state = {
    posts: [],
    category: 'All',
    query: '',
    visible: PAGE_SIZE
  };

  var els = {
    featured: document.getElementById('featured-post'),
    filters: document.getElementById('blog-filters'),
    search: document.getElementById('blog-search'),
    grid: document.getElementById('blog-grid'),
    count: document.getElementById('blog-count'),
    more: document.getElementById('blog-load-more')
  };

  function hashText(text) {
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) % 997;
    }
    return hash;
  }

  function coverMarkup(post) {
    var src = LB.safeUrl(post.cover);
    if (src) {
      return '<img src="' + src + '" alt="' + LB.escapeHtml(post.title) + '" loading="lazy">';
    }
    var gradient = PALETTE[hashText(post.category || post.title) % PALETTE.length];
    var initial = LB.escapeHtml((post.category || post.title || 'L').charAt(0).toUpperCase());
    return '<span class="blog-cover-fallback" style="background:' + gradient + '">' + initial + '</span>';
  }

  function metaMarkup(post) {
    return '<div class="blog-meta">' +
      '<time datetime="' + LB.toDateTimeAttr(post.date) + '">' + LB.formatDate(post.date) + '</time>' +
      '<span class="blog-meta-dot" aria-hidden="true">&bull;</span>' +
      '<span>' + LB.readingTime(post.body) + ' min read</span>' +
      '</div>';
  }

  function cardMarkup(post) {
    var url = LB.escapeHtml(LB.postUrl(post));
    return '<article class="blog-card">' +
      '<a class="blog-card-media" href="' + url + '" tabindex="-1" aria-hidden="true">' +
        coverMarkup(post) +
      '</a>' +
      '<div class="blog-card-body">' +
        '<span class="blog-card-cat">' + LB.escapeHtml(post.category) + '</span>' +
        metaMarkup(post) +
        '<h3 class="blog-card-title"><a href="' + url + '">' + LB.escapeHtml(post.title) + '</a></h3>' +
        '<p class="blog-card-excerpt">' + LB.escapeHtml(post.excerpt) + '</p>' +
        '<a class="blog-readmore" href="' + url + '">Read article <span aria-hidden="true">&rarr;</span></a>' +
      '</div>' +
    '</article>';
  }

  function featuredMarkup(post) {
    var url = LB.escapeHtml(LB.postUrl(post));
    return '<article class="blog-featured">' +
      '<a class="blog-featured-media" href="' + url + '" tabindex="-1" aria-hidden="true">' +
        coverMarkup(post) +
      '</a>' +
      '<div class="blog-featured-body">' +
        '<span class="blog-eyebrow">Featured story</span>' +
        metaMarkup(post) +
        '<h2 class="blog-featured-title"><a href="' + url + '">' + LB.escapeHtml(post.title) + '</a></h2>' +
        '<p class="blog-featured-excerpt">' + LB.escapeHtml(post.excerpt) + '</p>' +
        '<div class="blog-featured-actions">' +
          '<a class="btn btn-primary" href="' + url + '">Read the guide</a>' +
          '<span class="blog-author">By ' + LB.escapeHtml(post.author) + '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function matches(post) {
    if (state.category !== 'All' && post.category !== state.category) return false;
    if (!state.query) return true;
    var haystack = [post.title, post.excerpt, post.category, (post.tags || []).join(' '), post.body]
      .join(' ').toLowerCase();
    return haystack.indexOf(state.query) !== -1;
  }

  function filtered() {
    return state.posts.filter(matches);
  }

  function renderFilters() {
    if (!els.filters) return;
    var cats = ['All'].concat(LB.categories(state.posts));
    els.filters.innerHTML = cats.map(function (category) {
      var active = category === state.category ? ' active' : '';
      var label = category === 'All' ? 'All Posts' : category;
      return '<button type="button" class="category-btn' + active + '" data-category="' +
        LB.escapeHtml(category) + '">' + LB.escapeHtml(label) + '</button>';
    }).join('');

    els.filters.querySelectorAll('[data-category]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.category = button.getAttribute('data-category');
        state.visible = PAGE_SIZE;
        renderFilters();
        renderGrid();
      });
    });
  }

  function renderFeatured() {
    if (!els.featured) return;
    var source = state.posts;
    var featured = source.filter(function (post) { return post.featured; })[0] || source[0];
    els.featured.innerHTML = featured ? featuredMarkup(featured) : '';
  }

  function renderGrid() {
    if (!els.grid) return;

    var posts = filtered();
    var shown = posts.slice(0, state.visible);

    if (!posts.length) {
      els.grid.innerHTML = '<div class="blog-empty">' +
        '<strong>No articles match that search.</strong>' +
        '<span>Try a different keyword or pick another category.</span>' +
        '</div>';
    } else {
      els.grid.innerHTML = shown.map(cardMarkup).join('');
    }

    if (els.count) {
      els.count.textContent = posts.length === 1 ? '1 article' : posts.length + ' articles';
    }

    if (els.more) {
      var remaining = posts.length - shown.length;
      els.more.hidden = remaining <= 0;
      els.more.textContent = 'Load more articles (' + remaining + ')';
    }
  }

  function showError(message) {
    if (els.grid) {
      els.grid.innerHTML = '<div class="blog-empty"><strong>Blog could not load.</strong><span>' +
        LB.escapeHtml(message) + '</span></div>';
    }
    if (els.featured) els.featured.innerHTML = '';
    if (els.more) els.more.hidden = true;
  }

  function readQuery() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('category')) state.category = params.get('category');
    if (params.get('q')) {
      state.query = params.get('q').toLowerCase();
      if (els.search) els.search.value = params.get('q');
    }
  }

  function init() {
    readQuery();

    if (els.search) {
      var timer = null;
      els.search.addEventListener('input', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          state.query = els.search.value.trim().toLowerCase();
          state.visible = PAGE_SIZE;
          renderGrid();
        }, 120);
      });
    }

    if (els.more) {
      els.more.addEventListener('click', function () {
        state.visible += PAGE_SIZE;
        renderGrid();
      });
    }

    LB.loadPosts()
      .then(function (posts) {
        state.posts = LB.publishedPosts(posts);
        renderFeatured();
        renderFilters();
        renderGrid();
      })
      .catch(function (error) {
        showError(error.message || 'Please refresh the page.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
