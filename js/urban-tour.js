// Urban Tour · light-theme controls / adjustable playback, isolated from map boot.
export class UrbanTour {
  constructor(map, cities, onSelect) {
    this.map = map;
    this.cities = cities || [];
    this.onSelect = onSelect;
    this.index = 0;
    this.running = false;
    this.paused = false;
    this.stopRequested = false;
    this.serial = 0;
    this.speed = 0.65; // gentler default than the historical 1x playback

    this.panel = document.getElementById("tourPanel");
    this.cityName = document.getElementById("tourCityName");
    this.hierarchy = document.getElementById("tourHierarchy");
    this.district = document.getElementById("tourDistrict");
    this.counter = document.getElementById("tourCounter");
    this.status = document.getElementById("tourStatus");
    this.progress = document.getElementById("tourProgressBar");
    this.pauseBtn = document.getElementById("tourPauseBtn");
    this.speedControl = document.getElementById("tourSpeedSelect");
    this.speedOutput = document.getElementById("tourSpeedValue");

    this.speedControl.value = String(this.speed);
    this.syncSpeed();
    this.speedControl.addEventListener("change", () => {
      const value = Number(this.speedControl.value);
      this.speed = Number.isFinite(value) && value >= 0.4 && value <= 2 ? value : 0.65;
      this.syncSpeed();
    });

    document.getElementById("tourPrevBtn").addEventListener("click", () => this.previous());
    document.getElementById("tourNextBtn").addEventListener("click", () => this.next());
    document.getElementById("tourStopBtn").addEventListener("click", () => this.stop());
    document.getElementById("tourCloseBtn").addEventListener("click", () => this.stop());
    this.pauseBtn.addEventListener("click", () => this.togglePause());
  }

  syncSpeed() {
    this.speedOutput.textContent = this.speed.toLocaleString("ms-MY", { maximumFractionDigits: 2 }) + "×";
  }

  duration(base) { return Math.round(base / this.speed); }
  valid(serial) { return this.running && !this.stopRequested && serial === this.serial; }

  async waitPlayable(ms, serial) {
    let elapsed = 0;
    while (elapsed < ms && this.valid(serial)) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.paused) elapsed += 100;
    }
    return this.valid(serial);
  }

  async start() {
    if (!this.cities.length || this.running) return;
    this.panel.hidden = false;
    this.running = true;
    this.paused = false;
    this.stopRequested = false;
    this.index = 0;
    const serial = ++this.serial;
    this.pauseBtn.textContent = "⏸ Jeda";

    while (this.valid(serial) && this.index < this.cities.length) {
      const current = this.index;
      await this.visit(current, serial);
      if (!this.valid(serial)) break;
      if (!(await this.waitPlayable(this.duration(2200), serial))) break;
      if (current === this.index) this.index += 1;
    }

    if (this.valid(serial)) {
      this.status.textContent = "Tour selesai";
      this.map.flyTo({ center: [101.48, 3.18], zoom: 8.6, pitch: 42, bearing: 0, duration: this.duration(2600) });
      this.running = false;
    }
  }

  async visit(index, serial = this.serial) {
    const city = this.cities[index];
    if (!city || !this.valid(serial)) return;

    this.index = index;
    this.cityName.textContent = city.name;
    this.hierarchy.textContent = city.hierarchy || "Hierarki";
    this.district.textContent = city.district || city.daerah || "Selangor";
    this.counter.textContent = `${index + 1} / ${this.cities.length}`;
    this.status.textContent = "Menuju bandar";
    this.progress.style.width = `${((index + 1) / this.cities.length) * 100}%`;

    window.dispatchEvent(new CustomEvent("suo:location-change", {
      detail: { name: city.name, center: city.center }
    }));
    await this.animateTo(city, serial);
    if (this.valid(serial)) this.status.textContent = this.paused ? "Dijeda" : "Hentian semasa";
  }

  animateTo(city, serial) {
    return new Promise(resolve => {
      if (!this.valid(serial)) return resolve();
      const done = () => {
        this.map.off("moveend", done);
        resolve();
      };
      this.map.on("moveend", done);
      this.map.flyTo({
        center: city.center,
        zoom: city.zoom ?? 14.2,
        pitch: 64,
        bearing: 0,
        duration: this.duration(2600),
        essential: true
      });
    });
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    this.pauseBtn.textContent = this.paused ? "▶ Sambung" : "⏸ Jeda";
    this.status.textContent = this.paused ? "Dijeda" : "Disambung";
    // Pause affects time at each stop. The current map flight is allowed to finish.
  }

  skipTo(index) {
    if (!this.cities.length) return;
    const target = Math.max(0, Math.min(index, this.cities.length - 1));
    if (!this.running) {
      this.panel.hidden = false;
      this.running = true;
      this.stopRequested = false;
    }
    this.paused = false;
    this.pauseBtn.textContent = "⏸ Jeda";
    this.index = target;
    const serial = ++this.serial;
    this.map.stop();
    this.runFrom(target, serial);
  }

  async runFrom(index, serial) {
    while (this.valid(serial) && index < this.cities.length) {
      await this.visit(index, serial);
      if (!this.valid(serial)) break;
      if (!(await this.waitPlayable(this.duration(2200), serial))) break;
      index += 1;
      this.index = index;
    }
    if (this.valid(serial)) {
      this.status.textContent = "Tour selesai";
      this.running = false;
    }
  }

  next() { this.skipTo(this.index + 1); }
  previous() { this.skipTo(this.index - 1); }

  stop() {
    ++this.serial;
    this.running = false;
    this.stopRequested = true;
    this.paused = false;
    this.map.stop();
    this.panel.hidden = true;
  }
}
