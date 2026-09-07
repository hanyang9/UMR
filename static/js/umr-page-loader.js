const LOADERS = [
  {
    selector: "[data-umr-multi-robot-scene]",
    rootMargin: "320px 0px",
    load: async (target) => {
      const scene = await import("./multi-robot-autoplay.js?v=20260905-shadow-stability-v11");
      scene.mountCompactAutoplayScene(target, {
        assetRoot: new URL("../assets/multi_robot_scene/", import.meta.url).href,
        assetVersion: "20260823-all-source-topology-v5"
      });
    }
  },
  {
    selector: "[data-umr-baseline-comparison-scene]",
    rootMargin: "0px",
    load: async (target) => {
      await waitForSceneSettled(document.querySelector("[data-umr-multi-robot-scene]"));
      await waitForIdleFrame();
      const scene = await import("./multi-robot-autoplay.js?v=20260905-shadow-stability-v11");
      scene.mountCompactAutoplayScene(target, {
        assetRoot: new URL("../assets/baseline_comparison_scene/", import.meta.url).href,
        assetVersion: "20260902-box167-threeway-v1",
        camera: { azimuth: -90, distance: 6.7 }
      });
    }
  },
  {
    selector: ".mj-studio-shell",
    rootMargin: "180px 0px",
    load: () => import("./mujoco-viewer.js?v=20260905-studio-split-hoi-fix-v1")
  }
];

function waitForSceneSettled(target) {
  if (!target || ["ready", "error"].includes(target.dataset.state)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let timeoutId;
    const finish = () => {
      observer.disconnect();
      clearTimeout(timeoutId);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (["ready", "error"].includes(target.dataset.state)) finish();
    });
    observer.observe(target, { attributes: true, attributeFilter: ["data-state"] });
    timeoutId = setTimeout(finish, 30000);
  });
}

function waitForIdleFrame() {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(resolve, { timeout: 800 });
    } else {
      setTimeout(resolve, 50);
    }
  });
}

function loadNearViewport({ selector, rootMargin, load }) {
  const target = document.querySelector(selector);
  if (!target) return;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    Promise.resolve(load(target)).catch((error) => {
      console.error(`Could not initialize ${selector}`, error);
      target.dataset.state = "error";
    });
  };

  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    start();
  }, { rootMargin });
  observer.observe(target);
}

LOADERS.forEach(loadNearViewport);

function loadLazyImages() {
  const images = [...document.querySelectorAll("img[data-lazy-src]")];
  const load = (image) => {
    if (!image.dataset.lazySrc) return;
    image.src = image.dataset.lazySrc;
    delete image.dataset.lazySrc;
  };

  if (!("IntersectionObserver" in window)) {
    images.forEach(load);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      load(entry.target);
    });
  }, { rootMargin: "480px 0px" });
  images.forEach((image) => observer.observe(image));
}

loadLazyImages();

function loadLazyVideos() {
  const videos = [...document.querySelectorAll("video[data-lazy-src]")];
  const load = (video) => {
    if (!video.dataset.lazySrc) return;
    video.src = video.dataset.lazySrc;
    delete video.dataset.lazySrc;
    video.load();
    if (video.autoplay) {
      video.muted = true;
      video.defaultMuted = true;
      video.play().catch(() => {});
    }
  };

  if (!("IntersectionObserver" in window)) {
    videos.forEach(load);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      load(entry.target);
    });
  }, { rootMargin: "320px 0px" });
  videos.forEach((video) => observer.observe(video));
}

loadLazyVideos();

function setupTutorialSwitcher() {
  const switcher = document.querySelector("[data-tutorial-switcher]");
  if (!switcher) return;

  const cards = [...switcher.querySelectorAll(".mj-tutorial-card")];
  const activate = (nextCard) => {
    cards.forEach((card) => {
      const active = card === nextCard;
      card.classList.toggle("is-active", active);
      if (active) card.setAttribute("aria-current", "step");
      else card.removeAttribute("aria-current");
      if (!active) card.querySelector("video")?.pause();
    });
  };

  cards.forEach((card) => {
    card.addEventListener("pointerenter", () => activate(card));
    card.addEventListener("focusin", () => activate(card));
    card.addEventListener("click", () => activate(card));
  });

  activate(cards.find((card) => card.classList.contains("is-active")) || cards[0]);
}

setupTutorialSwitcher();
