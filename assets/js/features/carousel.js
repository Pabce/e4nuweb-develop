(function (app) {
  'use strict';

  const { normalizeLoopIndex, prefersReducedMotion } = app.lib.dom;
  const { createIntervalController } = app.lib.timers;
  let carouselPromise = null;

  function getCarouselDataUrl() {
    return new URL(app.config.CAROUSEL_DATA_URL, document.baseURI).toString();
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (typeof text === 'string') {
      element.textContent = text;
    }

    return element;
  }

  function createOptimizedImage(primarySrc, fallbackSrc, alt) {
    const image = createElement('img', 'block');

    image.alt = alt;
    image.decoding = 'async';
    image.loading = 'lazy';

    if (!fallbackSrc) {
      image.src = primarySrc;
      return image;
    }

    const picture = createElement('picture', 'block');
    const source = createElement('source');

    source.srcset = primarySrc;
    source.type = 'image/webp';
    image.src = fallbackSrc;

    picture.appendChild(source);
    picture.appendChild(image);

    return picture;
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function setStatus(root, message, isError) {
    const statusNode = root.querySelector('[data-carousel-status]');

    if (!statusNode) {
      return;
    }

    statusNode.textContent = message;
    statusNode.classList.toggle('hidden', !message);
    statusNode.classList.toggle('text-rose-300', Boolean(isError));
    statusNode.classList.toggle('text-gray-300', !isError);
  }

  function validateSlide(slide) {
    ['id', 'imageSrc', 'imageAlt', 'caption'].forEach((fieldName) => {
      if (typeof slide[fieldName] !== 'string' || !slide[fieldName].trim()) {
        throw new Error(`Missing carousel field: ${fieldName}`);
      }
    });

    if (slide.imageFallbackSrc && (typeof slide.imageFallbackSrc !== 'string' || !slide.imageFallbackSrc.trim())) {
      throw new Error(`Invalid carousel fallback image for ${slide.id}`);
    }

    return slide;
  }

  function loadSlides() {
    if (!carouselPromise) {
      carouselPromise = window
        .fetch(getCarouselDataUrl())
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to load carousel.');
          }

          return response.json();
        })
        .then((payload) => {
          if (!Array.isArray(payload)) {
            throw new Error('Carousel data must be an array.');
          }

          return payload.map(validateSlide);
        });
    }

    return carouselPromise;
  }

  function createSlide(slide) {
    const figure = createElement('figure', 'photo-slide w-full shrink-0');
    const caption = createElement('figcaption', 'px-6 py-4 text-sm text-gray-300 bg-navy/65', slide.caption);

    figure.appendChild(createOptimizedImage(slide.imageSrc, slide.imageFallbackSrc, slide.imageAlt));
    figure.appendChild(caption);

    return figure;
  }

  function createDot(index) {
    const dot = createElement('button', 'carousel-dot');
    dot.type = 'button';
    dot.setAttribute('data-carousel-dot', String(index));
    dot.setAttribute('aria-label', `View photo ${index + 1}`);
    dot.setAttribute('aria-current', 'false');
    return dot;
  }

  function renderSlides(root, slides) {
    const carouselTrack = root.querySelector('[data-carousel-track]');
    const dotsContainer = root.querySelector('[data-carousel-dots]');

    if (!carouselTrack || !dotsContainer) {
      return null;
    }

    clearNode(carouselTrack);
    clearNode(dotsContainer);

    slides.forEach((slide, index) => {
      carouselTrack.appendChild(createSlide(slide));
      dotsContainer.appendChild(createDot(index));
    });

    setStatus(root, '', false);

    return {
      slides: Array.from(carouselTrack.children),
      dots: Array.from(dotsContainer.querySelectorAll('[data-carousel-dot]')),
    };
  }

  function updateControlsVisibility(prevButton, nextButton, dotsContainer, slideCount) {
    const shouldShowControls = slideCount > 1;

    prevButton.classList.toggle('hidden', !shouldShowControls);
    nextButton.classList.toggle('hidden', !shouldShowControls);
    dotsContainer.classList.toggle('hidden', !shouldShowControls);
  }

  function initPhotoCarousel() {
    const carousel = document.querySelector('[data-carousel-root]');
    if (!carousel) {
      return;
    }

    const carouselTrack = carousel.querySelector('[data-carousel-track]');
    const dotsContainer = carousel.querySelector('[data-carousel-dots]');
    const prevButton = carousel.querySelector('[data-carousel-prev]');
    const nextButton = carousel.querySelector('[data-carousel-next]');
    if (!carouselTrack || !dotsContainer || !prevButton || !nextButton) {
      return;
    }

    setStatus(carousel, 'Loading carousel...', false);

    loadSlides()
      .then((slideData) => {
        if (!slideData.length) {
          updateControlsVisibility(prevButton, nextButton, dotsContainer, 0);
          setStatus(carousel, 'No carousel images available yet.', false);
          return;
        }

        const rendered = renderSlides(carousel, slideData);
        if (!rendered) {
          return;
        }

        const { slides, dots } = rendered;
        const reducedMotion = prefersReducedMotion();
        let currentSlide = 0;

        updateControlsVisibility(prevButton, nextButton, dotsContainer, slides.length);

        const autoPlay = createIntervalController(() => {
          showSlide(currentSlide + 1);
        }, app.config.CAROUSEL_AUTOPLAY_MS);

        function showSlide(index) {
          currentSlide = normalizeLoopIndex(index, slides.length);
          carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;

          dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === currentSlide;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-current', String(isActive));
          });
        }

        function restartAutoPlay() {
          autoPlay.stop();
          if (!reducedMotion && slides.length > 1) {
            autoPlay.start();
          }
        }

        prevButton.addEventListener('click', () => {
          showSlide(currentSlide - 1);
          restartAutoPlay();
        });

        nextButton.addEventListener('click', () => {
          showSlide(currentSlide + 1);
          restartAutoPlay();
        });

        dots.forEach((dot, index) => {
          dot.addEventListener('click', () => {
            showSlide(index);
            restartAutoPlay();
          });
        });

        carousel.addEventListener('mouseenter', autoPlay.stop);
        carousel.addEventListener('mouseleave', restartAutoPlay);

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            autoPlay.stop();
            return;
          }

          restartAutoPlay();
        });

        showSlide(0);
        restartAutoPlay();
      })
      .catch((error) => {
        updateControlsVisibility(prevButton, nextButton, dotsContainer, 0);
        setStatus(carousel, 'Unable to load carousel right now. Please try again later.', true);
        console.error('Failed to load carousel:', error);
      });
  }

  app.features.carousel = {
    initPhotoCarousel,
  };
})(window.e4nu);
