const STORAGE_KEY = "suoComparePanelUIV61";

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class ComparePanelUI {
  constructor() {
    this.panel = document.getElementById("comparePanel");
    this.heading = this.panel?.querySelector(".compare-panel-heading");
    this.minimizeButton = document.getElementById("compareMinimizeBtn");
    this.pinButton = document.getElementById("comparePinBtn");
    this.resetButton = document.getElementById("compareResetPositionBtn");

    if (
      !this.panel ||
      !this.heading ||
      !this.minimizeButton ||
      !this.pinButton ||
      !this.resetButton
    ) {
      return;
    }

    const saved = readState();

    this.state = {
      minimized: saved?.minimized ?? false,
      pinned: saved?.pinned ?? true,
      x: Number.isFinite(saved?.x) ? saved.x : null,
      y: Number.isFinite(saved?.y) ? saved.y : null
    };

    this.drag = {
      active: false,
      offsetX: 0,
      offsetY: 0
    };

    this.autoHideTimer = null;
    this.autoRestored = false;

    this.bind();
    this.restore();
  }

  bind() {
    this.minimizeButton.addEventListener("click", () => {
      this.state.minimized = !this.state.minimized;
      this.autoRestored = false;
      this.render();
      this.save();
    });

    this.pinButton.addEventListener("click", () => {
      this.state.pinned = !this.state.pinned;
      this.autoRestored = false;
      this.clearAutoHide();

      if (this.state.pinned && this.state.minimized) {
        this.state.minimized = false;
      }

      this.render();
      this.save();
    });

    this.resetButton.addEventListener("click", () => {
      this.state.x = null;
      this.state.y = null;
      this.state.minimized = false;
      this.panel.style.left = "";
      this.panel.style.top = "";
      this.panel.style.right = "";
      this.render();
      this.save();
    });

    this.heading.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      if (event.button !== 0) return;

      const panelRect = this.panel.getBoundingClientRect();
      const shellRect = this.panel.offsetParent?.getBoundingClientRect();

      if (!shellRect) return;

      this.drag.active = true;
      this.drag.offsetX = event.clientX - panelRect.left;
      this.drag.offsetY = event.clientY - panelRect.top;

      this.panel.classList.add("dragging");
      this.heading.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    this.heading.addEventListener("pointermove", (event) => {
      if (!this.drag.active) return;

      const shell = this.panel.offsetParent;
      if (!shell) return;

      const shellRect = shell.getBoundingClientRect();
      const panelRect = this.panel.getBoundingClientRect();

      const maxX = Math.max(
        0,
        shellRect.width - panelRect.width
      );

      const maxY = Math.max(
        0,
        shellRect.height - panelRect.height
      );

      const x = clamp(
        event.clientX - shellRect.left - this.drag.offsetX,
        0,
        maxX
      );

      const y = clamp(
        event.clientY - shellRect.top - this.drag.offsetY,
        0,
        maxY
      );

      this.state.x = x;
      this.state.y = y;

      this.panel.style.left = `${x}px`;
      this.panel.style.top = `${y}px`;
      this.panel.style.right = "auto";
    });

    const stopDrag = (event) => {
      if (!this.drag.active) return;

      this.drag.active = false;
      this.panel.classList.remove("dragging");

      try {
        this.heading.releasePointerCapture(event.pointerId);
      } catch (_) {}

      this.save();
    };

    this.heading.addEventListener("pointerup", stopDrag);
    this.heading.addEventListener("pointercancel", stopDrag);

    this.panel.addEventListener("mouseenter", () => {
      this.clearAutoHide();

      if (
        !this.state.pinned &&
        this.state.minimized
      ) {
        this.state.minimized = false;
        this.autoRestored = true;
        this.render();
      }
    });

    this.panel.addEventListener("mouseleave", () => {
      if (this.state.pinned || this.drag.active) return;

      this.clearAutoHide();

      this.autoHideTimer = window.setTimeout(() => {
        this.state.minimized = true;
        this.autoRestored = false;
        this.render();
        this.save();
      }, 650);
    });

    window.addEventListener("resize", () => {
      this.keepWithinBounds();
    });

    // Compare Engine opens the panel by adding `.visible`.
    const observer = new MutationObserver(() => {
      if (this.panel.classList.contains("visible")) {
        this.restore();
        requestAnimationFrame(() => this.keepWithinBounds());
      }
    });

    observer.observe(this.panel, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  restore() {
    if (
      Number.isFinite(this.state.x) &&
      Number.isFinite(this.state.y)
    ) {
      this.panel.style.left = `${this.state.x}px`;
      this.panel.style.top = `${this.state.y}px`;
      this.panel.style.right = "auto";
    }

    this.render();
  }

  render() {
    this.panel.classList.toggle(
      "minimized",
      this.state.minimized
    );

    this.panel.classList.toggle(
      "unpinned",
      !this.state.pinned
    );

    this.minimizeButton.textContent =
      this.state.minimized ? "▢" : "—";

    this.minimizeButton.title =
      this.state.minimized
        ? "Buka semula panel"
        : "Minimumkan panel";

    this.minimizeButton.setAttribute(
      "aria-expanded",
      String(!this.state.minimized)
    );
    this.minimizeButton.setAttribute("aria-label", this.minimizeButton.title);

    this.pinButton.textContent =
      this.state.pinned ? "📌" : "📍";

    this.pinButton.title =
      this.state.pinned
        ? "Nyahpin dan aktifkan sembunyi automatik"
        : "Pin panel supaya kekal terbuka";

    this.pinButton.setAttribute(
      "aria-pressed",
      String(this.state.pinned)
    );
    this.pinButton.setAttribute("aria-label", this.pinButton.title);
  }

  keepWithinBounds() {
    if (
      !Number.isFinite(this.state.x) ||
      !Number.isFinite(this.state.y)
    ) {
      return;
    }

    const shell = this.panel.offsetParent;
    if (!shell) return;

    const panelRect = this.panel.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();

    this.state.x = clamp(
      this.state.x,
      0,
      Math.max(0, shellRect.width - panelRect.width)
    );

    this.state.y = clamp(
      this.state.y,
      0,
      Math.max(0, shellRect.height - panelRect.height)
    );

    this.panel.style.left = `${this.state.x}px`;
    this.panel.style.top = `${this.state.y}px`;
    this.save();
  }

  clearAutoHide() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.state)
      );
    } catch (_) {}
  }
}
