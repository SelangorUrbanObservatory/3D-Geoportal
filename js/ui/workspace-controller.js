const STORAGE_KEY = "suoWorkspacePanelStateV80";
const WIDTH_STORAGE_KEY = "suoWorkspacePanelWidthsV1";

const MIN_PANEL_WIDTH = 250;
const MAX_PANEL_WIDTH = 580;
const MIN_MAP_WIDTH = 360;
const RESIZE_STEP = 24;
const DESKTOP_MIN_WIDTH = 981;

const clamp = (number, min, max) => Math.min(max, Math.max(min, number));

export class WorkspaceController {
  constructor({ map, compare }) {
    this.map = map;
    this.compare = compare;
    this.workspace = document.getElementById("workspace");
    this.leftSidebar = document.getElementById("leftSidebar");
    this.rightSidebar = document.getElementById("rightSidebar");
    this.openLeftPanelTab = document.getElementById("openLeftPanelTab");
    this.openRightPanelTab = document.getElementById("openRightPanelTab");
    this.focusMapBtn = document.getElementById("focusMapBtn");
    this.widthHandles = {
      left: document.getElementById("leftWidthHandle"),
      right: document.getElementById("rightWidthHandle")
    };
    this.state = { leftOpen: true, rightOpen: true };
    this.widths = this.getDefaultWidths();
    this.stateBeforeFocus = null;
    this.resizeTimer = null;
    this.mapResizeFrame = null;
    this.drag = null;

    this.readState();
    this.readWidths();
    this.constrainWidths();
    this.applyWidths();
    this.bind();
    this.render({ persist: false });
  }

  getDefaultWidths() {
    return window.innerWidth <= 1180
      ? { left: 290, right: 300 }
      : { left: 318, right: 330 };
  }

  isDesktop() {
    return window.innerWidth >= DESKTOP_MIN_WIDTH;
  }

  workspaceWidth() {
    return this.workspace?.getBoundingClientRect().width || window.innerWidth;
  }

  readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved.leftOpen === "boolean" &&
          typeof saved.rightOpen === "boolean") {
        this.state = { leftOpen: saved.leftOpen, rightOpen: saved.rightOpen };
      }
    } catch (_) {}
  }

  readWidths() {
    try {
      const saved = JSON.parse(localStorage.getItem(WIDTH_STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      for (const side of ["left", "right"]) {
        const width = saved[side];
        if (typeof width === "number" && Number.isFinite(width) &&
            width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
          this.widths[side] = Math.round(width);
        }
      }
    } catch (_) {}
  }

  saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch (_) {}
  }

  saveWidths() {
    try { localStorage.setItem(WIDTH_STORAGE_KEY, JSON.stringify(this.widths)); } catch (_) {}
  }

  maxWidthFor(side) {
    const other = side === "left" ? "right" : "left";
    const occupied = this.state[other + "Open"] ? this.widths[other] : 0;
    return Math.max(
      MIN_PANEL_WIDTH,
      Math.min(MAX_PANEL_WIDTH, this.workspaceWidth() - MIN_MAP_WIDTH - occupied)
    );
  }

  constrainWidths() {
    // Mobile drawers do not use desktop tracks; preserve the chosen desktop widths.
    if (!this.isDesktop()) return;
    this.widths.left = clamp(this.widths.left, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH);
    this.widths.right = clamp(this.widths.right, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH);
    const available = this.workspaceWidth() - MIN_MAP_WIDTH;
    // When both panels are visible, share reductions proportionally instead
    // of forcing all of the saved-width adjustment onto the left panel.
    if (this.state.leftOpen && this.state.rightOpen &&
        this.widths.left + this.widths.right > available) {
      const reduction = this.widths.left + this.widths.right - available;
      const leftSlack = this.widths.left - MIN_PANEL_WIDTH;
      const rightSlack = this.widths.right - MIN_PANEL_WIDTH;
      const totalSlack = leftSlack + rightSlack;
      const leftCut = totalSlack > 0
        ? Math.min(leftSlack, Math.round(reduction * leftSlack / totalSlack))
        : 0;
      this.widths.left = Math.round(this.widths.left - leftCut);
      this.widths.right = Math.round(Math.max(MIN_PANEL_WIDTH, this.widths.right - (reduction - leftCut)));
    } else {
      if (this.state.leftOpen) this.widths.left = Math.round(
        clamp(this.widths.left, MIN_PANEL_WIDTH, this.maxWidthFor("left"))
      );
      if (this.state.rightOpen) this.widths.right = Math.round(
        clamp(this.widths.right, MIN_PANEL_WIDTH, this.maxWidthFor("right"))
      );
    }
  }

  applyWidths() {
    if (!this.workspace) return;
    this.workspace.style.setProperty("--suo-left-panel-width", this.widths.left + "px");
    this.workspace.style.setProperty("--suo-right-panel-width", this.widths.right + "px");
    for (const side of ["left", "right"]) {
      const handle = this.widthHandles[side];
      if (!handle) continue;
      const available = this.isDesktop() && this.state[side + "Open"];
      handle.hidden = !available;
      handle.tabIndex = available ? 0 : -1;
      handle.setAttribute("aria-valuemin", String(MIN_PANEL_WIDTH));
      handle.setAttribute("aria-valuemax", String(Math.round(this.maxWidthFor(side))));
      handle.setAttribute("aria-valuenow", String(Math.round(this.widths[side])));
      handle.setAttribute("aria-valuetext", Math.round(this.widths[side]) + " piksel");
      handle.title = "Seret untuk ubah lebar panel " + (side === "left" ? "kiri" : "kanan") +
        ". Klik dua kali untuk saiz asal.";
    }
  }

  bind() {
    document.getElementById("closeLeftPanelBtn")
      ?.addEventListener("click", () => this.setLeft(false));
    document.getElementById("closeRightPanelBtn")
      ?.addEventListener("click", () => this.setRight(false));

    this.openLeftPanelTab?.addEventListener("click", () => this.setLeft(true));
    this.openRightPanelTab?.addEventListener("click", () => this.setRight(true));
    this.focusMapBtn?.addEventListener("click", () => this.toggleFocus());

    document.getElementById("mobileMenuBtn")
      ?.addEventListener("click", () => this.leftSidebar?.classList.toggle("open"));
    document.getElementById("rightPanelToggle")
      ?.addEventListener("click", () => this.rightSidebar?.classList.toggle("open"));

    for (const side of ["left", "right"]) {
      const handle = this.widthHandles[side];
      if (!handle) continue;
      handle.addEventListener("pointerdown", event => this.startDrag(side, event));
      handle.addEventListener("pointermove", event => this.moveDrag(side, event));
      handle.addEventListener("pointerup", event => this.endDrag(side, event));
      handle.addEventListener("pointercancel", event => this.endDrag(side, event));
      handle.addEventListener("lostpointercapture", () => this.endDrag(side));
      handle.addEventListener("keydown", event => this.keyResize(side, event));
      handle.addEventListener("dblclick", () => this.resetWidth(side));
    }

    window.addEventListener("resize", () => {
      if (this.drag && !this.isDesktop()) this.endDrag(this.drag.side);
      // Restore saved preferred dimensions if the desktop becomes wider again.
      if (!this.drag && this.isDesktop()) this.readWidths();
      this.constrainWidths();
      this.applyWidths();
      this.resizeMaps();
    });
    window.addEventListener("blur", () => {
      if (this.drag) this.endDrag(this.drag.side);
    });
  }

  startDrag(side, event) {
    if (!this.isDesktop() || !this.state[side + "Open"] ||
        (event.pointerType === "mouse" && event.button !== 0) ||
        this.drag) return;
    event.preventDefault();
    event.stopPropagation();
    this.drag = { side, pointerId: event.pointerId };
    this.workspace?.classList.add("is-panel-resizing");
    document.documentElement.classList.add("suo-panel-resizing");
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
  }

  moveDrag(side, event) {
    if (!this.drag || this.drag.side !== side || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const rect = this.workspace.getBoundingClientRect();
    const proposed = side === "left" ? event.clientX - rect.left : rect.right - event.clientX;
    this.setPanelWidth(side, proposed, { persist: false, animate: false });
  }

  endDrag(side, event) {
    if (!this.drag || this.drag.side !== side ||
        (event && this.drag.pointerId !== event.pointerId)) return;
    const drag = this.drag;
    this.drag = null;
    this.workspace?.classList.remove("is-panel-resizing");
    document.documentElement.classList.remove("suo-panel-resizing");
    const handle = this.widthHandles[side];
    try {
      if (handle?.hasPointerCapture(drag.pointerId)) handle.releasePointerCapture(drag.pointerId);
    } catch (_) {}
    this.saveWidths();
    this.resizeMaps();
  }

  keyResize(side, event) {
    if (!this.isDesktop()) return;
    const sign = side === "left" ? 1 : -1;
    let next;
    if (event.key === "Home") next = MIN_PANEL_WIDTH;
    else if (event.key === "End") next = this.maxWidthFor(side);
    else if (event.key === "ArrowRight") next = this.widths[side] + sign * RESIZE_STEP;
    else if (event.key === "ArrowLeft") next = this.widths[side] - sign * RESIZE_STEP;
    else return;
    event.preventDefault();
    this.setPanelWidth(side, next);
  }

  resetWidth(side) {
    if (!this.isDesktop()) return;
    this.setPanelWidth(side, this.getDefaultWidths()[side]);
  }

  setPanelWidth(side, requested, { persist = true, animate = false } = {}) {
    if (!["left", "right"].includes(side) || !Number.isFinite(requested)) return;
    const next = Math.round(clamp(requested, MIN_PANEL_WIDTH, this.maxWidthFor(side)));
    if (next === this.widths[side]) return;
    this.widths[side] = next;
    this.applyWidths();
    if (persist) this.saveWidths();
    // Coalesce frame callbacks while dragging to avoid expensive constant Mapbox resizes.
    this.queueMapResize();
  }

  setLeft(open) {
    this.state.leftOpen = Boolean(open);
    this.render();
  }

  setRight(open) {
    this.state.rightOpen = Boolean(open);
    this.render();
  }

  toggleFocus() {
    const focused = !this.state.leftOpen && !this.state.rightOpen;
    if (focused) {
      this.state = this.stateBeforeFocus || { leftOpen: true, rightOpen: true };
      this.stateBeforeFocus = null;
    } else {
      this.stateBeforeFocus = { ...this.state };
      this.state = { leftOpen: false, rightOpen: false };
    }
    this.render();
  }

  render({ persist = true } = {}) {
    if (!this.workspace || !this.leftSidebar || !this.rightSidebar) return;
    this.constrainWidths();
    this.applyWidths();

    this.workspace.classList.toggle("left-panel-collapsed", !this.state.leftOpen);
    this.workspace.classList.toggle("right-panel-collapsed", !this.state.rightOpen);
    this.leftSidebar.setAttribute("aria-hidden", String(!this.state.leftOpen));
    this.rightSidebar.setAttribute("aria-hidden", String(!this.state.rightOpen));

    if (this.openLeftPanelTab) this.openLeftPanelTab.hidden = this.state.leftOpen;
    if (this.openRightPanelTab) this.openRightPanelTab.hidden = this.state.rightOpen;

    const focused = !this.state.leftOpen && !this.state.rightOpen;
    if (this.focusMapBtn) {
      this.focusMapBtn.classList.toggle("active", focused);
      this.focusMapBtn.textContent = focused ? "▣ Restore Panels" : "▣ Focus Map";
    }

    if (persist) this.saveState();
    this.resizeMaps();
  }

  queueMapResize() {
    if (this.mapResizeFrame !== null) return;
    this.mapResizeFrame = requestAnimationFrame(() => {
      this.mapResizeFrame = null;
      try { this.map?.resize(); } catch (error) { console.warn("Map resize:", error); }
      try { this.compare?.compareMap?.resize(); } catch (error) { console.warn("Compare resize:", error); }
    });
  }

  resizeMaps() {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.queueMapResize();
    this.resizeTimer = setTimeout(() => this.queueMapResize(), 270);
  }
}
