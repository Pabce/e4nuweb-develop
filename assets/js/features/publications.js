(function (app) {
  'use strict';

  var publicationsPromise = null;

  function getPublicationsDataUrl() {
    return new URL(app.config.PUBLICATIONS_DATA_URL, document.baseURI).toString();
  }

  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (typeof text === 'string') {
      element.textContent = text;
    }

    return element;
  }

  function createLink(href, className, text) {
    var link = createElement('a', className, text);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    return link;
  }

  function createOptimizedImage(primarySrc, fallbackSrc, alt, className) {
    var image = createElement('img', className);

    image.alt = alt;
    image.decoding = 'async';
    image.loading = 'lazy';

    if (!fallbackSrc) {
      image.src = primarySrc;
      return image;
    }

    var picture = createElement('picture', 'block');
    var source = createElement('source');

    source.srcset = primarySrc;
    source.type = 'image/webp';
    image.src = fallbackSrc;

    picture.appendChild(source);
    picture.appendChild(image);

    return picture;
  }

  function readLimit(root) {
    var rawValue = root.getAttribute('data-publications-limit');

    if (!rawValue) {
      return app.config.PUBLICATIONS_PREVIEW_LIMIT;
    }

    if (rawValue === 'all') {
      return null;
    }

    var parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : app.config.PUBLICATIONS_PREVIEW_LIMIT;
  }

  function setStatus(root, message, isError) {
    var statusNode = root.querySelector('[data-publications-status]');

    if (!statusNode) {
      return;
    }

    statusNode.textContent = message;
    statusNode.classList.toggle('hidden', !message);
    statusNode.classList.toggle('text-rose-300', Boolean(isError));
    statusNode.classList.toggle('text-gray-500', !isError);
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function validatePublication(publication) {
    var requiredFields = [
      'id',
      'title',
      'authors',
      'published',
      'summary',
      'imageSrc',
      'imageAlt',
      'paperUrl',
      'citationText',
    ];

    requiredFields.forEach(function (fieldName) {
      if (typeof publication[fieldName] !== 'string' || !publication[fieldName].trim()) {
        throw new Error('Missing publication field: ' + fieldName);
      }
    });

    if (Number.isNaN(Date.parse(publication.published))) {
      throw new Error('Invalid publication date for ' + publication.id);
    }

    if (
      (publication.citationLinkLabel && !publication.citationLinkUrl) ||
      (!publication.citationLinkLabel && publication.citationLinkUrl)
    ) {
      throw new Error('Citation link fields must be provided together for ' + publication.id);
    }

    if (
      publication.imageFallbackSrc &&
      (typeof publication.imageFallbackSrc !== 'string' || !publication.imageFallbackSrc.trim())
    ) {
      throw new Error('Invalid publication fallback image for ' + publication.id);
    }

    return publication;
  }

  function loadPublications() {
    if (!publicationsPromise) {
      publicationsPromise = window
        .fetch(getPublicationsDataUrl())
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Failed to load publications.');
          }

          return response.json();
        })
        .then(function (payload) {
          if (!Array.isArray(payload)) {
            throw new Error('Publications data must be an array.');
          }

          return payload
            .map(validatePublication)
            .sort(function (left, right) {
              return Date.parse(right.published) - Date.parse(left.published);
            });
        });
    }

    return publicationsPromise;
  }

  function createCitation(publication) {
    var citation = createElement('p', 'text-sm text-gray-500 font-mono mt-1');
    citation.appendChild(document.createTextNode(publication.citationText));

    if (publication.citationLinkLabel && publication.citationLinkUrl) {
      citation.appendChild(document.createTextNode(' · '));
      citation.appendChild(
        createLink(
          publication.citationLinkUrl,
          'text-accent/70 hover:text-accent transition-colors',
          publication.citationLinkLabel,
        ),
      );
    }

    return citation;
  }

  function createPublicationCard(publication, index) {
    var card = createElement('article', 'group p-6 rounded-xl bg-white/[0.03] border border-white/5 card-hover');
    var header = createElement('div', 'flex gap-6');
    var badge = createElement(
      'div',
      'flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center',
    );
    var badgeNumber = createElement('span', 'pub-number font-medium', String(index + 1).padStart(2, '0'));
    var meta = createElement('div', 'flex-1');
    var authors = createElement('p', 'text-white/90 leading-relaxed mb-1', publication.authors);
    var title = createLink(
      publication.paperUrl,
      'text-white font-medium hover:text-accent transition-colors',
      '"' + publication.title + '"',
    );
    var body = createElement('div', 'flex flex-col md:flex-row gap-5 mt-5 ml-[4.5rem]');
    var summaryWrap = createElement('div', 'flex-1');
    var summary = createElement('p', 'text-sm text-gray-400 leading-relaxed', publication.summary);
    var imageLink = createLink(
      publication.paperUrl,
      'flex-shrink-0 w-full md:w-48 rounded-lg overflow-hidden border border-white/10 hover:border-accent/30 transition-colors',
    );
    badge.appendChild(badgeNumber);
    meta.appendChild(authors);
    meta.appendChild(title);
    meta.appendChild(createCitation(publication));
    header.appendChild(badge);
    header.appendChild(meta);

    summaryWrap.appendChild(summary);
    imageLink.appendChild(
      createOptimizedImage(
        publication.imageSrc,
        publication.imageFallbackSrc,
        publication.imageAlt,
        'w-full h-full object-cover',
      ),
    );
    body.appendChild(summaryWrap);
    body.appendChild(imageLink);

    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  function updateArchiveLink(root, totalCount, visibleCount) {
    var ctaNode = root.querySelector('[data-publications-cta]');
    var archiveUrl = root.getAttribute('data-publications-archive-url');

    if (!ctaNode) {
      return;
    }

    clearNode(ctaNode);

    if (!archiveUrl || visibleCount >= totalCount) {
      ctaNode.classList.add('hidden');
      return;
    }

    var link = createElement(
      'a',
      'inline-flex items-center gap-3 px-6 py-3 bg-accent/10 text-accent border border-accent/30 rounded-full hover:bg-accent/20 transition-all',
      'See all publications',
    );

    link.href = archiveUrl;

    ctaNode.appendChild(link);
    ctaNode.classList.remove('hidden');
  }

  function renderPublications(root, publications) {
    var listNode = root.querySelector('[data-publications-list]');
    var limit = readLimit(root);
    var visiblePublications = limit === null ? publications : publications.slice(0, limit);

    if (!listNode) {
      return;
    }

    clearNode(listNode);

    if (!publications.length) {
      setStatus(root, 'No publications available yet.', false);
      updateArchiveLink(root, 0, 0);
      return;
    }

    visiblePublications.forEach(function (publication, index) {
      listNode.appendChild(createPublicationCard(publication, index));
    });

    setStatus(root, '', false);
    updateArchiveLink(root, publications.length, visiblePublications.length);
  }

  function initPublications() {
    var roots = document.querySelectorAll('[data-publications-root]');

    if (!roots.length) {
      return;
    }

    roots.forEach(function (root) {
      setStatus(root, 'Loading publications...', false);
    });

    loadPublications()
      .then(function (publications) {
        roots.forEach(function (root) {
          renderPublications(root, publications);
        });
      })
      .catch(function (error) {
        var message = 'Unable to load publications right now. Please try again later.';

        if (window.location.protocol === 'file:') {
          message = 'Publications cannot load from file://. Open the site through a local web server instead.';
        }

        // eslint-disable-next-line no-console
        console.error('Failed to load publications:', error);

        roots.forEach(function (root) {
          renderPublications(root, []);
          setStatus(root, message, true);
        });
      });
  }

  app.features.publications = {
    initPublications: initPublications,
  };
})(window.e4nu);
