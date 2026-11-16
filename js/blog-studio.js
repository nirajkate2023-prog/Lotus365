/*
=============================================================================
  LOTUS365 - BLOG STUDIO
  File: js/blog-studio.js
  Browser editor that writes content/blog/posts.json back to the GitHub repo
  through the GitHub Contents API. If no token is configured it still works
  as a drafting tool and exports posts.json for manual upload.
=============================================================================
*/
(function () {
  'use strict';

  var LB = window.LotusBlog;
  if (!LB) return;

  var CONFIG_KEY = 'lotus365.blog.studio.config';
  var DRAFT_KEY = 'lotus365.blog.studio.draft';
  var DEFAULT_CATEGORIES = ['Aviator & Crash', 'Cricket & Sports', 'Card Games', 'Slots', 'Safety & Trust', 'Platform News'];

  var state = {
    config: { owner: 'nirajkate2023-prog', repo: 'Lotus365', branch: 'main', path: 'content/blog/posts.json', token: '', remember: false },
    posts: [],
    editingSlug: null,
    slugLocked: false,
    busy: false,
  };

  var el = {};

  /* ------------------------------------------------------------- storage */

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) { /* storage may be blocked; drafting still works in memory */ }
  }

  function loadConfig() {
    var saved = readJSON(CONFIG_KEY, null);
    if (saved) {
      state.config.owner = saved.owner || state.config.owner;
      state.config.repo = saved.repo || state.config.repo;
      state.config.branch = saved.branch || state.config.branch;
      state.config.path = saved.path || state.config.path;
      state.config.remember = saved.remember === true;
      if (saved.remember && saved.token) state.config.token = saved.token;
    }
  }

  function saveConfig() {
    writeJSON(CONFIG_KEY, {
      owner: state.config.owner,
      repo: state.config.repo,
      branch: state.config.branch,
      path: state.config.path,
      remember: state.config.remember,
      token: state.config.remember ? state.config.token : ''
    });
  }

  /* --------------------------------------------------------------- utils */

  function setStatus(kind, message) {
    if (!el.status) return;
    el.status.className = 'studio-status' + (kind ? ' is-' + kind : '');
    el.status.textContent = message || '';
  }

  function setConnState(kind, message) {
    if (!el.connState) return;
    el.connState.className = 'conn-state' + (kind ? ' is-' + kind : '');
    el.connState.textContent = message || '';
  }

  function b64EncodeUnicode(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  function b64DecodeUnicode(value) {
    var binary = window.atob(String(value || '').replace(/\s/g, ''));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function ensureTrailingSlashless(path) {
    return String(path || '').replace(/^\/+|\/+$/g, '');
  }

  function hasRepo() {
    return !!(state.config.owner && state.config.repo && state.config.token);
  }

  function syncConnection() {
    state.config.owner = el.owner.value.trim();
    state.config.repo = el.repo.value.trim();
    state.config.branch = el.branch.value.trim() || 'main';
    state.config.path = el.path.value.trim() || 'content/blog/posts.json';
    state.config.token = el.token.value.trim();
    state.config.remember = el.remember.checked;
  }

  function serialize() {
    return JSON.stringify({
      version: 1,
      site: 'https://lotus365slot.com',
      updated: new Date().toISOString(),
      categories: DEFAULT_CATEGORIES,
      posts: state.posts
    }, null, 2) + '\n';
  }

  /* ---------------------------------------------------------- GitHub API */

  function api(path, options) {
    options = options || {};
    var headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + state.config.token,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    var request = { method: options.method || 'GET', headers: headers };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
      request.body = JSON.stringify(options.body);
    }

    return window.fetch('https://api.github.com' + path, request).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (error) { data = null; }
        if (!response.ok) {
          var reason = (data && data.message) || response.statusText || 'Request failed';
          var error = new Error(reason);
          error.status = response.status;
          throw error;
        }
        return data;
      });
    });
  }

  function contentsPath() {
    return ensureTrailingSlashless(state.config.path)
      .split('/')
      .map(encodeURIComponent)
      .join('/');
  }

  function repoUrl() {
    return '/repos/' + encodeURIComponent(state.config.owner) + '/' + encodeURIComponent(state.config.repo);
  }

  function describeError(error) {
    if (error.status === 401) return 'Token rejected (401). Regenerate your fine-grained token with Contents access.';
    if (error.status === 403) return 'Access denied (403). The token needs "Contents: Read and write" permission on this repo.';
    if (error.status === 404) return 'Repo or file not found (404). Check the owner, repo name and branch.';
    if (error.status === 409) return 'Commit conflict (409). Reload posts and publish again.';
    if (error.status === 422) return 'GitHub rejected the commit (422). Check the branch name and file path.';
    return error.message || 'Request failed.';
  }

  function fetchRemoteFile() {
    var url = repoUrl() + '/contents/' + contentsPath() + '?ref=' + encodeURIComponent(state.config.branch);
    return api(url).then(function (file) {
      return { sha: file.sha, text: b64DecodeUnicode(file.content) };
    });
  }

  function commitPosts(message) {
    var url = repoUrl() + '/contents/' + contentsPath();
    return fetchRemoteFile()
      .catch(function (error) {
        if (error.status === 404) return null;
        throw error;
      })
      .then(function (existing) {
        var body = {
          message: message,
          content: b64EncodeUnicode(serialize()),
          branch: state.config.branch
        };
        if (existing && existing.sha) body.sha = existing.sha;
        return api(url, { method: 'PUT', body: body });
      });
  }

  function connect() {
    if (!hasRepo()) {
      setConnState('warn', 'Add owner, repo and a token first.');
      return Promise.resolve(false);
    }
    setConnState('busy', 'Checking access...');
    return api(repoUrl())
      .then(function (repo) {
        var permissions = repo.permissions || {};
        if (permissions.push === false) {
          setConnState('warn', 'Connected, but this token cannot write to the repo.');
          return false;
        }
        return fetchRemoteFile().then(function () {
          setConnState('ok', 'Connected to ' + repo.full_name + ' (' + state.config.branch + ').');
          return true;
        });
      })
      .catch(function (error) {
        setConnState('error', describeError(error));
        return false;
      });
  }

  /* ---------------------------------------------------------- data load */

  function applyPosts(posts) {
    state.posts = (posts || [])
      .filter(function (post) { return post && post.slug; })
      .map(LB.normalizePost)
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    renderList();
  }

  function loadPosts() {
    if (hasRepo()) {
      setStatus('busy', 'Loading posts from GitHub...');
      return fetchRemoteFile()
        .then(function (file) {
          var data = JSON.parse(file.text);
          applyPosts(Array.isArray(data) ? data : data.posts);
          setStatus('ok', 'Loaded ' + state.posts.length + ' posts from GitHub.');
        })
        .catch(function (error) {
          if (error.status === 404) {
            applyPosts([]);
            setStatus('warn', 'No posts.json on this branch yet. Publishing the first post will create it.');
            return;
          }
          setStatus('error', describeError(error));
        });
    }

    return window.fetch(LB.DATA_URL + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('no file');
        return response.json();
      })
      .then(function (data) {
        applyPosts(Array.isArray(data) ? data : data.posts);
        setStatus('ok', 'Loaded ' + state.posts.length + ' posts from this website. Connect GitHub to publish.');
      })
      .catch(function () {
        renderList();
        setStatus('warn', 'No posts loaded. Import content/blog/posts.json or connect GitHub.');
      });
  }

  /* ------------------------------------------------------------ renders */

  function renderList() {
    if (!el.list) return;

    if (!state.posts.length) {
      el.list.innerHTML = '<p class="studio-empty">No posts yet. Start with "New post".</p>';
    } else {
      el.list.innerHTML = state.posts.map(function (post) {
        var isEditing = post.slug === state.editingSlug;
        return '<div class="studio-item' + (isEditing ? ' is-editing' : '') + '" data-slug="' + LB.escapeHtml(post.slug) + '">' +
          '<div class="studio-item-main">' +
            '<strong>' + LB.escapeHtml(post.title) + '</strong>' +
            '<span class="studio-item-meta">' + LB.formatDate(post.date) + ' &bull; ' + LB.escapeHtml(post.category) +
              ' &bull; <em class="' + (post.published ? 'st-live' : 'st-draft') + '">' + (post.published ? 'published' : 'draft') + '</em></span>' +
          '</div>' +
          '<div class="studio-item-actions">' +
            '<button type="button" class="mini-btn" data-action="edit">Edit</button>' +
            '<button type="button" class="mini-btn danger" data-action="delete">Delete</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    if (el.listCount) {
      el.listCount.textContent = state.posts.length + (state.posts.length === 1 ? ' post' : ' posts');
    }
  }

  function renderPreview() {
    if (!el.previewBody) return;
    var title = el.title.value.trim() || 'Untitled post';
    var body = el.body.value;
    var category = el.category.value.trim() || 'Platform News';
    var author = el.author.value.trim() || 'Lotus365 Editorial';
    var date = el.date.value;

    el.previewTitle.textContent = title;

    var when = date ? LB.formatDate(date + 'T09:00:00') : 'No date set';
    el.previewMeta.textContent = category + '  •  By ' + author + '  •  ' + when + '  •  ' + LB.readingTime(body) + ' min read';

    var cover = LB.safeUrl(el.cover.value.trim());
    if (cover) {
      el.previewCover.innerHTML = '<img src="' + cover + '" alt="">';
      el.previewCover.hidden = false;
    } else {
      el.previewCover.innerHTML = '';
      el.previewCover.hidden = true;
    }

    el.previewBody.innerHTML = body.trim()
      ? LB.renderMarkdown(body)
      : '<p class="studio-empty">Start typing to see the rendered article.</p>';

    var words = body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0;
    el.statWords.textContent = words + (words === 1 ? ' word' : ' words');
    el.statRead.textContent = LB.readingTime(body) + ' min read';
  }

  /* ------------------------------------------------------- form binding */

  function formValues() {
    return {
      title: el.title.value.trim(),
      slug: el.slug.value.trim(),
      category: el.category.value.trim(),
      tags: el.tags.value.split(',').map(function (tag) { return tag.trim(); }).filter(Boolean),
      author: el.author.value.trim() || 'Lotus365 Editorial',
      date: el.date.value,
      cover: el.cover.value.trim(),
      excerpt: el.excerpt.value.trim(),
      body: el.body.value,
      featured: el.featured.checked,
      published: el.published.checked
    };
  }

  function fillForm(post) {
    el.title.value = post ? post.title : '';
    el.slug.value = post ? post.slug : '';
    el.category.value = post ? post.category : (state.posts[0] ? state.posts[0].category : 'Platform News');
    el.tags.value = post ? (post.tags || []).join(', ') : '';
    el.author.value = post ? post.author : 'Lotus365 Editorial';
    el.date.value = post ? new Date(post.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    el.cover.value = post ? post.cover : '';
    el.excerpt.value = post ? post.excerpt : '';
    el.body.value = post ? post.body : '';
    el.featured.checked = post ? post.featured : false;
    el.published.checked = post ? post.published : true;

    state.editingSlug = post ? post.slug : null;
    state.slugLocked = !!post;

    el.mode.textContent = post ? 'Editing: ' + post.title : 'New post';
    el.publish.textContent = post ? 'Update post' : 'Publish post';
    el.del.hidden = !post;

    renderList();
    renderPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markDirty() {
    if (el.draftNote) el.draftNote.hidden = false;
    window.clearTimeout(markDirty.timer);
    markDirty.timer = window.setTimeout(saveDraft, 600);
  }

  function saveDraft() {
    writeJSON(DRAFT_KEY, {
      editingSlug: state.editingSlug,
      values: formValues(),
      savedAt: new Date().toISOString()
    });
  }

  function restoreDraft() {
    var draft = readJSON(DRAFT_KEY, null);
    if (!draft || !draft.values) return false;

    var values = draft.values;
    el.title.value = values.title || '';
    el.slug.value = values.slug || '';
    el.category.value = values.category || 'Platform News';
    el.tags.value = (values.tags || []).join(', ');
    el.author.value = values.author || 'Lotus365 Editorial';
    el.date.value = values.date || new Date().toISOString().slice(0, 10);
    el.cover.value = values.cover || '';
    el.excerpt.value = values.excerpt || '';
    el.body.value = values.body || '';
    el.featured.checked = !!values.featured;
    el.published.checked = values.published !== false;

    state.editingSlug = draft.editingSlug || null;
    state.slugLocked = !!state.editingSlug;

    el.mode.textContent = state.editingSlug ? 'Editing: ' + (values.title || state.editingSlug) : 'Restored draft';
    el.publish.textContent = state.editingSlug ? 'Update post' : 'Publish post';
    el.del.hidden = !state.editingSlug;

    if (el.draftNote) el.draftNote.hidden = false;
    renderPreview();
    renderList();
    return true;
  }

  function uniqueSlug(slug, ignoreSlug) {
    var base = LB.slugify(slug) || 'post';
    var candidate = base;
    var index = 2;
    while (state.posts.some(function (post) {
      return post.slug === candidate && post.slug !== ignoreSlug;
    })) {
      candidate = base + '-' + index;
      index++;
    }
    return candidate;
  }

  function buildPost() {
    var values = formValues();
    if (!values.title) throw new Error('Add a title before saving.');
    if (!values.body.trim()) throw new Error('The article body is empty.');

    var slug = uniqueSlug(values.slug || values.title, state.editingSlug);
    var isoDate = values.date ? new Date(values.date + 'T09:00:00').toISOString() : new Date().toISOString();

    var post = LB.normalizePost({
      id: state.editingSlug || ('post-' + slug),
      slug: slug,
      title: values.title,
      excerpt: values.excerpt || LB.plainText(values.body, 160),
      category: values.category || 'Platform News',
      tags: values.tags,
      author: values.author,
      date: isoDate,
      cover: values.cover,
      featured: values.featured,
      published: values.published,
      body: values.body
    });

    return post;
  }

  function persist(post, mode) {
    var index = -1;
    state.posts.forEach(function (item, position) {
      if (item.slug === state.editingSlug) index = position;
    });

    if (mode === 'update' && index !== -1) {
      state.posts[index] = post;
    } else {
      state.posts.unshift(post);
    }

    state.posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    return post;
  }

  function publish() {
    if (state.busy) return;

    syncConnection();

    var post;
    try {
      post = buildPost();
    } catch (error) {
      setStatus('error', error.message);
      return;
    }

    var mode = state.editingSlug ? 'update' : 'create';
    var verb = mode === 'update' ? 'update' : 'publish';

    state.busy = true;
    el.publish.disabled = true;

    var snapshot = state.posts.slice();
    persist(post, mode);

    var finish = function (message, kind) {
      state.busy = false;
      el.publish.disabled = false;
      writeJSON(DRAFT_KEY, null);
      if (el.draftNote) el.draftNote.hidden = true;
      state.editingSlug = post.slug;
      state.slugLocked = true;
      el.slug.value = post.slug;
      el.mode.textContent = 'Editing: ' + post.title;
      el.publish.textContent = 'Update post';
      el.del.hidden = false;
      renderList();
      setStatus(kind, message);
    };

    if (hasRepo()) {
      setStatus('busy', 'Committing to GitHub...');
      commitPosts('blog: ' + verb + ' "' + post.title + '"')
        .then(function () {
          finish('Saved to GitHub. Your host will serve it after the next deploy.', 'ok');
        })
        .catch(function (error) {
          state.posts = snapshot;
          renderList();
          finish(describeError(error), 'error');
        });
      return;
    }

    finish('Saved locally. Use "Download posts.json" and upload it to /content/blog/ to go live.', 'warn');
  }

  function removePost(slug) {
    var post = state.posts.filter(function (item) { return item.slug === slug; })[0];
    if (!post) return;
    if (!window.confirm('Delete "' + post.title + '"? This cannot be undone.')) return;

    var snapshot = state.posts.slice();
    state.posts = state.posts.filter(function (item) { return item.slug !== slug; });
    renderList();

    var after = function (kind, message) {
      if (state.editingSlug === slug) fillForm(null);
      setStatus(kind, message);
    };

    if (hasRepo()) {
      setStatus('busy', 'Deleting on GitHub...');
      commitPosts('blog: delete "' + post.title + '"')
        .then(function () { after('ok', 'Deleted. Live after the next deploy.'); })
        .catch(function (error) {
          state.posts = snapshot;
          renderList();
          after('error', describeError(error));
        });
    } else {
      after('warn', 'Removed locally. Download posts.json and upload it to /content/blog/.');
    }
  }

  function download() {
    var blob = new Blob([serialize()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'posts.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus('ok', 'posts.json downloaded. Upload it to public_html/content/blog/.');
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        applyPosts(Array.isArray(data) ? data : data.posts);
      } catch (error) {
        setStatus('error', 'That file is not valid posts.json.');
        return;
      }

      if (!hasRepo()) {
        setStatus('ok', 'Imported ' + state.posts.length + ' posts from ' + file.name + '.');
        return;
      }

      setStatus('busy', 'Importing and committing to GitHub...');
      commitPosts('blog: import posts.json')
        .then(function () {
          setStatus('ok', 'Imported ' + state.posts.length + ' posts and committed to GitHub.');
        })
        .catch(function (error) {
          setStatus('error', describeError(error));
        });
    };
    reader.readAsText(file);
  }

  /* -------------------------------------------------------------- wiring */

  function bind() {
    el.title.addEventListener('input', function () {
      if (!state.slugLocked) el.slug.value = LB.slugify(el.title.value);
      markDirty();
      renderPreview();
    });

    el.slug.addEventListener('input', function () {
      state.slugLocked = el.slug.value.trim().length > 0;
      markDirty();
    });

    ['f-category', 'f-tags', 'f-author', 'f-date', 'f-cover', 'f-excerpt', 'f-body'].forEach(function (id) {
      var node = document.getElementById(id);
      if (!node) return;
      node.addEventListener('input', function () {
        markDirty();
        renderPreview();
      });
    });

    el.featured.addEventListener('change', markDirty);
    el.published.addEventListener('change', markDirty);

    el.publish.addEventListener('click', publish);
    el.del.addEventListener('click', function () {
      if (state.editingSlug) removePost(state.editingSlug);
    });

    el.list.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var row = button.closest('[data-slug]');
      if (!row) return;
      var slug = row.getAttribute('data-slug');

      if (button.getAttribute('data-action') === 'edit') {
        var post = state.posts.filter(function (item) { return item.slug === slug; })[0];
        if (post) fillForm(post);
      } else if (button.getAttribute('data-action') === 'delete') {
        removePost(slug);
      }
    });

    el.new.addEventListener('click', function () {
      writeJSON(DRAFT_KEY, null);
      if (el.draftNote) el.draftNote.hidden = true;
      fillForm(null);
      el.title.focus();
    });

    el.download.addEventListener('click', download);

    el.import.addEventListener('change', function () {
      importFile(el.import.files[0]);
      el.import.value = '';
    });

    el.connect.addEventListener('click', function () {
      syncConnection();
      saveConfig();
      connect().then(function (ok) {
        if (ok) loadPosts();
      });
    });

    el.forget.addEventListener('click', function () {
      state.config.token = '';
      el.token.value = '';
      state.config.remember = false;
      el.remember.checked = false;
      saveConfig();
      setConnState('', 'Token cleared from this browser.');
    });

    el.discardDraft.addEventListener('click', function () {
      writeJSON(DRAFT_KEY, null);
      if (el.draftNote) el.draftNote.hidden = true;
      fillForm(null);
      setStatus('', 'Draft discarded.');
    });

    document.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        publish();
      }
    });
  }

  function init() {
    el.connect = document.getElementById('btn-connect');
    el.forget = document.getElementById('btn-forget');
    el.publish = document.getElementById('btn-publish');
    el.del = document.getElementById('btn-delete');
    el.download = document.getElementById('btn-download');
    el.new = document.getElementById('btn-new');
    el.import = document.getElementById('import-file');
    el.discardDraft = document.getElementById('btn-discard-draft');

    el.title = document.getElementById('f-title');
    el.slug = document.getElementById('f-slug');
    el.category = document.getElementById('f-category');
    el.tags = document.getElementById('f-tags');
    el.author = document.getElementById('f-author');
    el.date = document.getElementById('f-date');
    el.cover = document.getElementById('f-cover');
    el.excerpt = document.getElementById('f-excerpt');
    el.body = document.getElementById('f-body');
    el.featured = document.getElementById('f-featured');
    el.published = document.getElementById('f-published');
    el.mode = document.getElementById('editor-mode');
    el.list = document.getElementById('studio-list');
    el.listCount = document.getElementById('studio-list-count');
    el.connState = document.getElementById('conn-state');
    el.draftNote = document.getElementById('draft-note');
    el.status = document.getElementById('studio-status');
    el.previewTitle = document.getElementById('preview-title');
    el.previewMeta = document.getElementById('preview-meta');
    el.previewCover = document.getElementById('preview-cover');
    el.previewBody = document.getElementById('preview-body');
    el.statWords = document.getElementById('stat-words');
    el.statRead = document.getElementById('stat-read');

    el.owner = document.getElementById('cfg-owner');
    el.repo = document.getElementById('cfg-repo');
    el.branch = document.getElementById('cfg-branch');
    el.path = document.getElementById('cfg-path');
    el.token = document.getElementById('cfg-token');
    el.remember = document.getElementById('cfg-remember');

    loadConfig();
    el.owner.value = state.config.owner;
    el.repo.value = state.config.repo;
    el.branch.value = state.config.branch;
    el.path.value = state.config.path;
    el.token.value = state.config.token;
    el.remember.checked = state.config.remember;

    var categoryList = document.getElementById('category-options');
    if (categoryList) {
      categoryList.innerHTML = DEFAULT_CATEGORIES.map(function (category) {
        return '<option value="' + LB.escapeHtml(category) + '"></option>';
      }).join('');
    }

    bind();
    fillForm(null);

    if (restoreDraft()) setStatus('warn', 'Restored your unsaved draft.');

    if (hasRepo()) {
      connect().then(function () { loadPosts(); });
    } else {
      loadPosts();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
