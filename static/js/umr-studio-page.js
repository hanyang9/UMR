const mount = document.querySelector("#umr-standalone-studio");
const ROBOT_PRESET_DRAG_TYPE = "application/x-umr-robot-preset";

function setupTutorials() {
  const switcher = document.querySelector("[data-tutorial-switcher]");
  if (!switcher) return;
  const cards = [...switcher.querySelectorAll(".mj-tutorial-card")];
  const videos = cards.map((card) => card.querySelector("video[data-lazy-src]")).filter(Boolean);
  const loadVideo = (video) => {
    if (!video.dataset.lazySrc) return;
    video.src = video.dataset.lazySrc;
    delete video.dataset.lazySrc;
    video.load();
  };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        loadVideo(entry.target);
      });
    }, { rootMargin: "320px 0px" });
    videos.forEach((video) => observer.observe(video));
  } else {
    videos.forEach(loadVideo);
  }

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

function setupRobotDragDemonstration() {
  const source = document.querySelector('[data-umr-robot-preset="g1"] img');
  const stage = mount?.querySelector("#mj-stage");
  const target = mount?.querySelector("#mj-drop-hint");
  const viewer = mount?.querySelector("#mujoco-tpose-viewer");
  const folderInput = mount?.querySelector("#mj-folder-input");
  if (!source || !stage || !target || !viewer) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const ghost = document.createElement("div");
  ghost.className = "umr-g1-drag-demo";
  ghost.setAttribute("aria-hidden", "true");
  const preview = source.cloneNode(false);
  preview.alt = "";
  preview.draggable = false;
  preview.loading = "eager";
  ghost.appendChild(preview);
  document.body.appendChild(ghost);

  let stopped = false;
  let animation = null;
  let replayTimer = 0;
  let observer = null;

  const hasAssetPayload = (dataTransfer) => {
    if (!dataTransfer) return false;
    if (dataTransfer.files?.length) return true;
    if (dataTransfer.getData(ROBOT_PRESET_DRAG_TYPE)) return true;
    return (dataTransfer.getData("text/plain") || "").startsWith("umr-robot-preset:");
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(replayTimer);
    animation?.cancel();
    observer?.disconnect();
    stage.removeEventListener("drop", onDrop, true);
    folderInput?.removeEventListener("change", onFolderChange, true);
    document.removeEventListener("paste", onPaste, true);
    ghost.remove();
  };

  const onDrop = (event) => {
    if (hasAssetPayload(event.dataTransfer)) stop();
  };
  const onFolderChange = () => {
    if (folderInput?.files?.length) stop();
  };
  const onPaste = (event) => {
    const clipboard = event.clipboardData;
    if (clipboard?.files?.length || [...(clipboard?.items || [])].some((item) => item.kind === "file")) {
      stop();
    }
  };

  const scheduleReplay = (delay = 900) => {
    if (stopped) return;
    window.clearTimeout(replayTimer);
    replayTimer = window.setTimeout(play, delay);
  };

  const play = async () => {
    if (stopped) return;
    if (document.hidden) {
      scheduleReplay(700);
      return;
    }

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
      scheduleReplay(700);
      return;
    }

    const width = Math.min(152, Math.max(96, sourceRect.width * 0.72));
    const height = width * (sourceRect.height / sourceRect.width);
    const startX = sourceRect.left + (sourceRect.width - width) / 2;
    const startY = sourceRect.top + (sourceRect.height - height) / 2;
    const endX = targetRect.left + (targetRect.width - width) / 2;
    const endY = targetRect.top + (targetRect.height - height) / 2;
    const distance = Math.hypot(endX - startX, endY - startY);
    const duration = Math.min(3400, Math.max(2300, 2050 + distance * 0.18));

    ghost.style.width = `${width}px`;
    ghost.style.height = `${height}px`;
    animation = ghost.animate([
      {
        transform: `translate3d(${startX}px, ${startY}px, 0) scale(1) rotate(0deg)`,
        opacity: 0,
      },
      {
        offset: 0.1,
        transform: `translate3d(${startX}px, ${startY}px, 0) scale(1) rotate(0deg)`,
        opacity: 0.62,
      },
      {
        offset: 0.76,
        opacity: 0.54,
      },
      {
        transform: `translate3d(${endX}px, ${endY}px, 0) scale(0.76) rotate(-1deg)`,
        opacity: 0,
      },
    ], {
      duration,
      easing: "cubic-bezier(.42, 0, .18, 1)",
      fill: "both",
    });

    try {
      await animation.finished;
    } catch {
      return;
    }
    scheduleReplay();
  };

  stage.addEventListener("drop", onDrop, true);
  folderInput?.addEventListener("change", onFolderChange, true);
  document.addEventListener("paste", onPaste, true);
  observer = new MutationObserver(() => {
    if (viewer.dataset.robotSource === "preset" || viewer.dataset.robotSource === "custom") {
      stop();
    }
  });
  observer.observe(viewer, { attributes: true, attributeFilter: ["data-robot-source"] });

  if (viewer.dataset.robotSource === "preset" || viewer.dataset.robotSource === "custom") {
    stop();
    return;
  }
  window.addEventListener("beforeunload", stop, { once: true });
  play();
}

async function mountStandaloneStudio() {
  if (!mount) return;
  try {
    const response = await fetch(
      new URL("../../umr_project.html?v=20260905-custom-tpose-reminder-v2", import.meta.url),
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`Could not load the Studio layout (HTTP ${response.status}).`);
    }
    const documentText = await response.text();
    const sourceDocument = new DOMParser().parseFromString(documentText, "text/html");
    const template = sourceDocument.querySelector("#umr-studio-template");
    if (!template) throw new Error("The Studio layout template is missing.");
    mount.replaceChildren(template.content.cloneNode(true));
    await import("./mujoco-viewer.js?v=20260905-model-browser-collapse-v1");
    setupRobotDragDemonstration();
  } catch (error) {
    console.error("Could not initialize the standalone UMR Studio", error);
    mount.innerHTML = "";
    const failure = document.createElement("div");
    failure.className = "notification is-danger is-light";
    failure.textContent = error?.message || String(error);
    mount.appendChild(failure);
  }
}

setupTutorials();
mountStandaloneStudio();
