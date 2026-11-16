/*
=============================================================================
  LOTUS365 - SINGLE POST VIEW
  File: js/blog-post.js
  Reads ?slug= from the URL, renders the article, updates SEO tags,
  injects Article structured data and lists related reading.
=============================================================================
*/
(function () {
  'use strict';

  var LB = window.LotusBlog;
  if (!LB) return;

  var els = {
    article: document.getElementById('post-article'),
    related: document.getElementById('post-related'),
    relatedGrid: document.getElementById('post-related-grid'),
    crumb: document.getElementById('post-crumb')
  };

  var SITE = 'https://lotus365slot.com';

  function setMeta(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.setAttribute('content', value);
  }

  function updateHead(post) {
    var url = SITE + LB.postUrl(post);
    var description = post.excerpt;

    document.title = post.title + ' | Lotus365 Blog';

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', url);

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', post.title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:type"]', 'article');
    setMeta('meta[name="twitter:title"]', post.title);
    setMeta('meta[name="twitter:description"]', description);

    if (post.cover) {
      var image = SITE + '/' + post.cover.replace(/^\//, '');
      setMeta('meta[property="og:image"]', image);
      setMeta('meta[name="twitter:image"]', image);
    }

    var schema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: description,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: post.author },
      publisher: {
        '@type': 'Organization',
        name: 'Lotus365',
        logo: { '@type': 'ImageObject', url: SITE + '/images/logo.png' }
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      articleSection: post.category,
      keywords: (post.tags || []).join(', ')
    };

    if (post.cover) schema.image = SITE + '/' + post.cover.replace(/^\//, '');

    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  function shareMarkup(post) {
    var url = encodeURIComponent(SITE + LB.postUrl(post));
    var text = encodeURIComponent(post.title);
    return '<div class="post-share">' +
      '<span class="post-share-label">Share</span>' +
      '<a class="share-btn share-wa" href="https://wa.me/?text=' + text + '%20' + url + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
      '<a class="share-btn" href="https://twitter.com/intent/tweet?text=' + text + '&amp;url=' + url + '" target="_blank" rel="noopener noreferrer">X</a>' +
      '<button type="button" class="share-btn" id="copy-link-btn" data-url="' + LB.escapeHtml(SITE + LB.postUrl(post)) + '">Copy link</button>' +
    '</div>';
  }

  function articleMarkup(post) {
    var cover = LB.safeUrl(post.cover);
    var tags = (post.tags || []).map(function (tag) {
      return '<span class="post-tag">#' + LB.escapeHtml(tag) + '</span>';
    }).join('');

    return '<header class="post-header">' +
        '<a class="blog-eyebrow" href="/blog?category=' + encodeURIComponent(post.category) + '">' + LB.escapeHtml(post.category) + '</a>' +
        '<h1 class="post-title">' + LB.escapeHtml(post.title) + '</h1>' +
        '<p class="post-standfirst">' + LB.escapeHtml(post.excerpt) + '</p>' +
        '<div class="post-meta-row">' +
          '<span class="post-author">By ' + LB.escapeHtml(post.author) + '</span>' +
          '<span class="blog-meta-dot" aria-hidden="true">&bull;</span>' +
          '<time datetime="' + LB.toDateTimeAttr(post.date) + '">' + LB.formatDate(post.date) + '</time>' +
          '<span class="blog-meta-dot" aria-hidden="true">&bull;</span>' +
          '<span>' + LB.readingTime(post.body) + ' min read</span>' +
        '</div>' +
      '</header>' +
      (cover ? '<figure class="post-cover"><img src="' + cover + '" alt="' + LB.escapeHtml(post.title) + '"></figure>' : '') +
      '<div class="post-body">' + LB.renderMarkdown(post.body) + '</div>' +
      '<footer class="post-footer">' +
        '<div class="post-tags">' + tags + '</div>' +
        shareMarkup(post) +
        '<div class="post-disclaimer"><span class="age-badge">18+</span>' +
          '<p>This article is editorial content about platform features and play habits. Online gaming carries financial risk. ' +
          'Read our <a href="/responsible-gambling">Responsible Gambling</a> guidance before you play.</p>' +
        '</div>' +
      '</footer>';
  }

  function relatedMarkup(posts, current) {
    if (!posts.length) return '';
    return posts.map(function (post) {
      var cover = LB.safeUrl(post.cover);
      return '<article class="related-card">' +
        '<a class="related-media" href="' + LB.escapeHtml(LB.postUrl(post)) + '" tabindex="-1" aria-hidden="true">' +
          (cover ? '<img src="' + cover + '" alt="" loading="lazy">' : '<span class="blog-cover-fallback" style="background:linear-gradient(135deg,#10263f,#00b0ff)">' + LB.escapeHtml(post.category.charAt(0)) + '</span>') +
        '</a>' +
        '<div class="related-body">' +
          '<span class="blog-card-cat inline">' + LB.escapeHtml(post.category) + '</span>' +
          '<h3><a href="' + LB.escapeHtml(LB.postUrl(post)) + '">' + LB.escapeHtml(post.title) + '</a></h3>' +
          '<span class="related-meta">' + LB.formatDate(post.date) + ' &bull; ' + LB.readingTime(post.body) + ' min read</span>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function showMessage(title, message) {
    if (!els.article) return;
    els.article.innerHTML = '<div class="post-missing">' +
      '<h1>' + LB.escapeHtml(title) + '</h1>' +
      '<p>' + LB.escapeHtml(message) + '</p>' +
      '<a class="btn btn-primary" href="/blog">Back to the blog</a>' +
    '</div>';
  }

  function bindCopyLink() {
    var button = document.getElementById('copy-link-btn');
    if (!button) return;
    button.addEventListener('click', function () {
      var url = button.getAttribute('data-url');
      var done = function () {
        button.textContent = 'Copied';
        window.setTimeout(function () { button.textContent = 'Copy link'; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
      } else {
        window.prompt('Copy this link:', url);
      }
    });
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug') || params.get('p') || '';

    LB.loadPosts()
      .then(function (all) {
        var posts = LB.publishedPosts(all);

        if (!slug && posts.length) {
          window.location.replace(LB.postUrl(posts[0]));
          return;
        }

        var post = LB.findPost(slug, posts);
        if (!post) {
          document.title = 'Article not found | Lotus365 Blog';
          showMessage('That article has moved', 'We could not find a post with this address. Browse the blog for the latest guides.');
          return;
        }

        if (els.crumb) els.crumb.textContent = post.title;
        updateHead(post);

        if (els.article) els.article.innerHTML = articleMarkup(post);
        bindCopyLink();

        var related = posts.filter(function (item) {
          return item.slug !== post.slug && item.category === post.category;
        });
        if (related.length < 3) {
          posts.forEach(function (item) {
            if (related.length < 3 && item.slug !== post.slug && related.indexOf(item) === -1) {
              related.push(item);
            }
          });
        }
        related = related.slice(0, 3);

        if (els.related && els.relatedGrid && related.length) {
          els.relatedGrid.innerHTML = relatedMarkup(related);
          els.related.hidden = false;
        }
      })
      .catch(function (error) {
        showMessage('Blog temporarily unavailable', error.message || 'Please refresh the page in a moment.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
