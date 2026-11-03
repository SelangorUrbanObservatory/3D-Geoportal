const CONFIG_URL = "config/external-links.json";

async function loadExternalLinks() {
  const response = await fetch(CONFIG_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Gagal memuatkan konfigurasi pautan luaran.");
  }

  return response.json();
}

export class ExecutiveLanduseIntelligence {
  constructor() {
    this.dashboardLink =
      document.getElementById("openSismapsDashboard");
    this.applicationsLink =
      document.getElementById("openSismapsApplications");
    this.status =
      document.getElementById("landuseIntelligenceStatus");

    this.bindActions();
    this.initialize();
  }

  async initialize() {
    try {
      const config = await loadExternalLinks();

      const dashboardUrl =
        String(config.sismapsExecutiveDashboard || "").trim();

      const applicationsUrl =
        String(config.sismapsApplications || "").trim();

      if (applicationsUrl) {
        this.applicationsLink.href = applicationsUrl;
      }

      if (dashboardUrl) {
        this.dashboardLink.href = dashboardUrl;
        this.dashboardLink.dataset.linkType = "direct";
        this.status.textContent =
          "Pautan SISMAPS tersedia. URL khusus Executive Dashboard belum disahkan.";
        this.status.classList.add("ready");
      } else {
        this.dashboardLink.href =
          applicationsUrl ||
          "https://selangorurbanobservatory.github.io/SUO.Portal/applications.html";

        this.dashboardLink.dataset.linkType = "fallback";
        this.status.textContent =
          "URL terus dashboard belum dikonfigurasi. Butang akan membuka halaman Applications SUO.";
        this.status.classList.add("warning");
      }
    } catch (error) {
      console.error(error);

      this.dashboardLink.href =
        "https://selangorurbanobservatory.github.io/SUO.Portal/applications.html";

      this.status.textContent =
        "Konfigurasi pautan gagal dimuatkan. Menggunakan halaman Applications SUO.";
      this.status.classList.add("warning");
    }
  }

  bindActions() {
    document.querySelectorAll("[data-landuse-action]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.landuseAction;

          const labels = {
            statistics:
              "Statistik guna tanah akan dipaparkan melalui SISMAPS Executive Dashboard.",
            trend:
              "Trend Analysis disediakan sebagai modul pengembangan Executive Landuse Intelligence.",
            comparison:
              "Perbandingan guna tanah boleh dibangunkan mengikut PBT, daerah atau tahun.",
            forecast:
              "Land Use Forecast memerlukan siri masa guna tanah yang telah disahkan."
          };

          this.status.textContent =
            labels[action] || "Modul dipilih.";
        });
      });
  }
}
