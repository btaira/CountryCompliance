const state = {
  countries: [],
};

const elements = {
  cardGrid: document.getElementById("card-grid"),
  searchInput: document.getElementById("search-input"),
  sortSelect: document.getElementById("sort-select"),
  filterCompliance: document.getElementById("filter-compliance"),
  filterLocalRep: document.getElementById("filter-local-rep"),
  filterEnergy: document.getElementById("filter-energy"),
  clearFilters: document.getElementById("clear-filters"),
  resultCount: document.getElementById("result-count"),
  sourceLink: document.getElementById("source-link"),
  statCountries: document.getElementById("stat-countries"),
  statAuthorities: document.getElementById("stat-authorities"),
  statRefresh: document.getElementById("stat-refresh"),
  cardTemplate: document.getElementById("country-card-template"),
};

function normalizeText(value) {
  return (value || "").trim();
}

function emptyDisplay(value) {
  return normalizeText(value) || "Not listed";
}

function parsePopulation(value) {
  const text = normalizeText(value).toLowerCase();
  const numeric = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(numeric)) return 0;
  if (text.includes("billion")) return numeric * 1_000_000_000;
  if (text.includes("million")) return numeric * 1_000_000;
  if (text.includes("thousand")) return numeric * 1_000;
  return numeric;
}

function classifyValue(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text || text.includes("unknown") || text.includes("depends") || text.includes("mixed")) return "unknown";
  if (text.startsWith("no") || text === "none" || text.includes("not required")) return "no";
  if (text.includes("yes")) return "yes";
  return "unknown";
}

function chipClassName(stateKey) {
  if (stateKey === "yes") return "chip-yes";
  if (stateKey === "no") return "chip-no";
  return "chip-mixed";
}

function createChip(label, stateKey) {
  const chip = document.createElement("span");
  chip.className = `chip ${chipClassName(stateKey)}`;
  chip.textContent = label;
  return chip;
}

function labelForState(stateKey) {
  if (stateKey === "yes") return "Yes";
  if (stateKey === "no") return "No";
  return "Mixed";
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function enrichCountry(country) {
  const nemko = country.nemko;
  const approvalState = classifyValue(nemko.compliance_requirement_for_telecom_radio);
  const localRepState = classifyValue(nemko.local_representation_required_for_approval);
  const energyState = classifyValue(nemko.energy_efficiency_requirements);
  const searchBlob = [
    country.country,
    nemko.national_language,
    nemko.population,
    nemko.regulatory_authority,
    nemko.other_requirements,
    country.workbook.summary.product_types.join(" "),
  ].join(" ").toLowerCase();

  return {
    ...country,
    nemko,
    approvalState,
    localRepState,
    energyState,
    populationValue: parsePopulation(nemko.population),
    searchBlob,
  };
}

function renderCards(countries) {
  elements.cardGrid.innerHTML = "";
  if (!countries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No countries match the current filters.";
    elements.cardGrid.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const country of countries) {
    const node = elements.cardTemplate.content.cloneNode(true);
    const title = node.querySelector(".card-title");
    const kicker = node.querySelector(".card-kicker");
    const flag = node.querySelector(".flag-image");
    const chips = node.querySelector(".chip-row");
    const link = node.querySelector(".card-action");

    title.textContent = country.country;
    kicker.textContent = country.nemko.country_css_class.replace(/-/g, " ");
    flag.src = country.nemko.flag_image_url || "";
    flag.alt = `${country.country} flag`;
    if (!country.nemko.flag_image_url) flag.style.visibility = "hidden";

    chips.append(
      createChip(`Approval ${labelForState(country.approvalState)}`, country.approvalState),
      createChip(`Local rep ${labelForState(country.localRepState)}`, country.localRepState),
      createChip(`Energy ${labelForState(country.energyState)}`, country.energyState),
    );

    for (const field of node.querySelectorAll("[data-field]")) {
      field.textContent = emptyDisplay(country.nemko[field.dataset.field]);
    }

    link.href = `./country.html?country=${encodeURIComponent(country.slug)}`;
    fragment.append(node);
  }

  elements.cardGrid.append(fragment);
}

function applyFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const compliance = elements.filterCompliance.value;
  const localRep = elements.filterLocalRep.value;
  const energy = elements.filterEnergy.value;
  const sortKey = elements.sortSelect.value;

  let filtered = state.countries.filter((country) => {
    if (query && !country.searchBlob.includes(query)) return false;
    if (compliance && country.approvalState !== compliance) return false;
    if (localRep && country.localRepState !== localRep) return false;
    if (energy && country.energyState !== energy) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    if (sortKey === "population") return b.populationValue - a.populationValue || a.country.localeCompare(b.country);
    if (sortKey === "authority") return a.nemko.regulatory_authority.localeCompare(b.nemko.regulatory_authority) || a.country.localeCompare(b.country);
    return a.country.localeCompare(b.country);
  });

  elements.resultCount.textContent = `${filtered.length} of ${state.countries.length} countries shown`;
  renderCards(filtered);
}

function renderStats(dataset) {
  const authorities = new Set(dataset.countries.map((country) => normalizeText(country.nemko?.regulatory_authority)).filter(Boolean));
  elements.statCountries.textContent = String(dataset.country_count ?? dataset.countries.length);
  elements.statAuthorities.textContent = String(authorities.size);
  elements.statRefresh.textContent = formatDate(dataset.fetched_at_utc);
  if (dataset.source_url) elements.sourceLink.href = dataset.source_url;
}

function attachEvents() {
  elements.searchInput.addEventListener("input", applyFilters);
  elements.sortSelect.addEventListener("change", applyFilters);
  elements.filterCompliance.addEventListener("change", applyFilters);
  elements.filterLocalRep.addEventListener("change", applyFilters);
  elements.filterEnergy.addEventListener("change", applyFilters);
  elements.clearFilters.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.sortSelect.value = "country";
    elements.filterCompliance.value = "";
    elements.filterLocalRep.value = "";
    elements.filterEnergy.value = "";
    applyFilters();
  });
}

async function init() {
  attachEvents();
  try {
    const response = await fetch("./data/country_compliance_database.json");
    if (!response.ok) throw new Error(`Failed to load data: ${response.status}`);
    const dataset = await response.json();
    state.countries = dataset.countries.filter((country) => country.nemko).map(enrichCountry);
    renderStats(dataset);
    applyFilters();
  } catch (error) {
    elements.resultCount.textContent = "Unable to load country data.";
    elements.cardGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

init();
