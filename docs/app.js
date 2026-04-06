const state = {
  dataset: null,
  countries: [],
  filtered: [],
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
  detailsDialog: document.getElementById("details-dialog"),
  detailsShell: document.querySelector(".details-shell"),
  detailsContent: document.getElementById("details-content"),
  closeDialog: document.getElementById("close-dialog"),
  cardTemplate: document.getElementById("country-card-template"),
};

const DETAIL_SECTIONS = [
  {
    title: "Overview",
    fields: [
      ["National Language", "national_language"],
      ["Population", "population"],
      ["Regulatory Authority", "regulatory_authority"],
      ["Approval Validity", "approval_validity"],
    ],
  },
  {
    title: "Radio / Telecom",
    fields: [
      ["Compliance Requirement", "compliance_requirement_for_telecom_radio"],
      ["Mandatory Requirements", "mandatory_requirements_telecom_radio_safety_emc"],
      ["In-Country Test", "in_country_test"],
      ["Language Requirements", "language_requirements_application_manual_report"],
      ["Local Representation", "local_representation_required_for_approval"],
      ["Country Specific Labelling", "country_specific_labelling"],
      ["Factory Inspection", "factory_inspection"],
      ["Other Requirements", "other_requirements"],
    ],
  },
  {
    title: "Safety / EMC",
    fields: [
      ["EMC Certification", "emc_certification_and_test_report_required_for_it_products"],
      ["Emission / Immunity", "emission_and_immunity"],
      ["Safety Certification", "safety_certification_required_for_it_products"],
      ["Safety Test Report", "safety_test_report_requirement"],
      ["RoHS Certification", "rohs_certification_required_for_it_products"],
      ["RoHS Requirements", "rohs_requirements"],
      ["Sample Required", "sample_required_in_country"],
      ["Manual / Marking Language", "language_requirements_user_manual_product_safety_markings"],
      ["Local Applicant", "local_representative_applicant_required"],
      ["Factory Inspection", "mandatory_factory_inspection_requirement"],
      ["Remarks", "remarks"],
    ],
  },
  {
    title: "Energy Efficiency",
    fields: [["Requirements", "energy_efficiency_requirements"]],
  },
];

const ASSET_FIELDS = [
  ["Flag", "flag_image_url"],
  ["Radio / Telecom Certificate", "radio_telecom_certificate_example_url"],
  ["Radio / Telecom Mark", "radio_telecom_mark_artwork_url"],
  ["Safety / EMC Certificate", "safety_emc_certificate_example_url"],
  ["Safety / EMC Mark", "safety_emc_mark_artwork_url"],
  ["Energy Efficiency Certificate", "energy_efficiency_certificate_example_url"],
  ["Energy Efficiency Mark", "energy_efficiency_mark_artwork_url"],
];

function normalizeText(value) {
  return (value || "").trim();
}

function parsePopulation(value) {
  const text = normalizeText(value).toLowerCase();
  const numeric = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(numeric)) {
    return 0;
  }

  if (text.includes("billion")) {
    return numeric * 1_000_000_000;
  }

  if (text.includes("million")) {
    return numeric * 1_000_000;
  }

  if (text.includes("thousand")) {
    return numeric * 1_000;
  }

  return numeric;
}

function classifyValue(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text || text.includes("unknown") || text.includes("depends") || text.includes("mixed")) {
    return "unknown";
  }

  if (text.startsWith("no") || text === "none" || text.includes("not required")) {
    return "no";
  }

  if (text.includes("yes")) {
    return "yes";
  }

  return "unknown";
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function enrichCountry(country) {
  const approvalState = classifyValue(country.compliance_requirement_for_telecom_radio);
  const localRepState = classifyValue(country.local_representation_required_for_approval);
  const energyState = classifyValue(country.energy_efficiency_requirements);
  const searchBlob = [
    country.country,
    country.national_language,
    country.population,
    country.regulatory_authority,
    country.mandatory_requirements_telecom_radio_safety_emc,
    country.language_requirements_application_manual_report,
    country.other_requirements,
    country.remarks,
    country.energy_efficiency_requirements,
  ]
    .join(" ")
    .toLowerCase();

  return {
    ...country,
    approvalState,
    localRepState,
    energyState,
    populationValue: parsePopulation(country.population),
    searchBlob,
  };
}

function createChip(label, stateKey) {
  const chip = document.createElement("span");
  chip.className = `chip ${chipClassName(stateKey)}`;
  chip.textContent = label;
  return chip;
}

function chipClassName(stateKey) {
  if (stateKey === "yes") {
    return "chip-yes";
  }
  if (stateKey === "no") {
    return "chip-no";
  }
  return "chip-mixed";
}

function emptyDisplay(value) {
  return normalizeText(value) || "Not listed";
}

function createDetailItem(label, value) {
  const item = document.createElement("div");
  item.className = "detail-item";
  item.innerHTML = `<dt>${label}</dt><dd>${emptyDisplay(value)}</dd>`;
  return item;
}

function renderWorkbookTable(entries) {
  const wrap = document.createElement("div");
  wrap.className = "data-table-wrap";

  if (!entries.length) {
    wrap.innerHTML = '<p class="table-note">No country-specific workbook rows were listed.</p>';
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "detail-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product</th>
        <th>Agency</th>
        <th>Approval Need</th>
        <th>Cost</th>
        <th>Samples</th>
        <th>Lead Time</th>
        <th>Validity</th>
        <th>Recert</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  for (const entry of entries) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${emptyDisplay(entry.product_type)}</strong>
        <div class="table-subline">${emptyDisplay(entry.support_contact)}</div>
      </td>
      <td>${emptyDisplay(entry.agency)}</td>
      <td>${emptyDisplay(entry.comment)}</td>
      <td>
        <div>${emptyDisplay(entry.cost_per_certificate)}</div>
        <div class="table-subline">Add'l COO: ${emptyDisplay(entry.cost_for_additional_country_of_origin)}</div>
      </td>
      <td>
        <div>${emptyDisplay(entry.sample_needed_for_certification)}</div>
        <div class="table-subline">Recert: ${emptyDisplay(entry.sample_needed_for_recertification)}</div>
      </td>
      <td>
        <div>Cert: ${emptyDisplay(entry.lead_time_for_certification_months)}</div>
        <div class="table-subline">Sample: ${emptyDisplay(entry.lead_time_for_sample_months)}</div>
      </td>
      <td>${emptyDisplay(entry.certificate_validity_years)}</td>
      <td>
        <div>${emptyDisplay(entry.recertification_cost)}</div>
        <div class="table-subline">LT: ${emptyDisplay(entry.lead_time_for_recertification_months)}</div>
      </td>
    `;
    tbody.append(row);
  }

  wrap.append(table);
  return wrap;
}

function renderCommentList(comments) {
  const list = document.createElement("dl");
  list.className = "detail-list";
  for (const comment of comments) {
    const item = document.createElement("div");
    item.className = "detail-item";
    item.innerHTML = `<dt>${emptyDisplay(comment.row_reference)} · ${emptyDisplay(comment.author)} · ${emptyDisplay(comment.created_at)}</dt><dd>${emptyDisplay(comment.comment)}</dd>`;
    list.append(item);
  }
  return list;
}

function renderHandbookApprovals(approvals) {
  const wrap = document.createElement("div");
  wrap.className = "handbook-stack";

  if (!approvals.length) {
    wrap.innerHTML = '<p class="table-note">No hardware handbook approvals were listed for this country.</p>';
    return wrap;
  }

  for (const approval of approvals) {
    const block = document.createElement("section");
    block.className = "handbook-unit";

    const standards = (approval.standards || [])
      .map(
        (item) =>
          `<div class="detail-item"><dt>${emptyDisplay(item.category)}</dt><dd>${emptyDisplay(item.standard_specification)}</dd></div>`
      )
      .join("");

    block.innerHTML = `
      <div class="handbook-header">
        <h5>${emptyDisplay(approval.business_unit)}</h5>
        <span class="timeline-pill">${emptyDisplay(approval.timeline || "No timeline listed")}</span>
      </div>
      <p class="table-note">${emptyDisplay(approval.comments || approval.country_group)}</p>
      <dl class="detail-list">
        <div class="detail-item"><dt>Country Group</dt><dd>${emptyDisplay(approval.country_group)}</dd></div>
        ${standards}
      </dl>
    `;
    wrap.append(block);
  }

  return wrap;
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
    const article = node.querySelector(".country-card");
    const title = node.querySelector(".card-title");
    const kicker = node.querySelector(".card-kicker");
    const flag = node.querySelector(".flag-image");
    const chips = node.querySelector(".chip-row");
    const button = node.querySelector(".card-action");

    title.textContent = country.country;
    kicker.textContent = country.country_css_class.replace(/-/g, " ");
    flag.src = country.flag_image_url || "";
    flag.alt = `${country.country} flag`;

    if (!country.flag_image_url) {
      flag.style.visibility = "hidden";
    }

    chips.append(
      createChip(
        `Approval ${labelForState(country.approvalState)}`,
        country.approvalState
      ),
      createChip(
        `Local rep ${labelForState(country.localRepState)}`,
        country.localRepState
      ),
      createChip(
        `Energy ${labelForState(country.energyState)}`,
        country.energyState
      )
    );

    for (const field of article.querySelectorAll("[data-field]")) {
      field.textContent = emptyDisplay(country[field.dataset.field]);
    }

    button.addEventListener("click", () => openDetails(country));
    fragment.append(node);
  }

  elements.cardGrid.append(fragment);
}

function labelForState(stateKey) {
  if (stateKey === "yes") {
    return "Yes";
  }
  if (stateKey === "no") {
    return "No";
  }
  return "Mixed";
}

function applyFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const compliance = elements.filterCompliance.value;
  const localRep = elements.filterLocalRep.value;
  const energy = elements.filterEnergy.value;
  const sortKey = elements.sortSelect.value;

  let filtered = state.countries.filter((country) => {
    if (query && !country.searchBlob.includes(query)) {
      return false;
    }
    if (compliance && country.approvalState !== compliance) {
      return false;
    }
    if (localRep && country.localRepState !== localRep) {
      return false;
    }
    if (energy && country.energyState !== energy) {
      return false;
    }
    return true;
  });

  filtered = filtered.sort((a, b) => {
    if (sortKey === "population") {
      return b.populationValue - a.populationValue || a.country.localeCompare(b.country);
    }
    if (sortKey === "authority") {
      return a.regulatory_authority.localeCompare(b.regulatory_authority) || a.country.localeCompare(b.country);
    }
    return a.country.localeCompare(b.country);
  });

  state.filtered = filtered;
  elements.resultCount.textContent = `${filtered.length} of ${state.countries.length} countries shown`;
  renderCards(filtered);
}

function renderStats(dataset) {
  const authorities = new Set(
    dataset.countries
      .map((country) => normalizeText(country.nemko?.regulatory_authority))
      .filter(Boolean)
  );

  elements.statCountries.textContent = String(dataset.country_count ?? dataset.countries.length);
  elements.statAuthorities.textContent = String(authorities.size);
  elements.statRefresh.textContent = formatDate(dataset.fetched_at_utc);

  if (dataset.source_url) {
    elements.sourceLink.href = dataset.source_url;
  }
}

function openDetails(country) {
  const unified = country.unified;
  elements.detailsContent.innerHTML = "";

  const hero = document.createElement("section");
  hero.className = "detail-hero";
  hero.innerHTML = `
    <div>
      <p class="eyebrow">Requirement Detail</p>
      <h3>${country.country}</h3>
      <p class="lede">${emptyDisplay(country.regulatory_authority)}</p>
      <p><a class="asset-link" href="./data/${unified.country_file}" target="_blank" rel="noreferrer">Open country JSON</a></p>
    </div>
    ${country.flag_image_url ? `<img class="flag-image" src="${country.flag_image_url}" alt="${country.country} flag">` : ""}
  `;

  const grid = document.createElement("section");
  grid.className = "detail-grid";

  for (const section of DETAIL_SECTIONS) {
    const block = document.createElement("article");
    block.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = section.title;
    block.append(heading);

    const list = document.createElement("dl");
    list.className = "detail-list";

    for (const [label, key] of section.fields) {
      const item = document.createElement("div");
      item.className = "detail-item";
      item.innerHTML = `<dt>${label}</dt><dd>${emptyDisplay(country[key])}</dd>`;
      list.append(item);
    }

    block.append(list);
    grid.append(block);
  }

  const assets = document.createElement("article");
  assets.className = "detail-section";

  const assetsHeading = document.createElement("h4");
  assetsHeading.textContent = "Linked Assets";
  assets.append(assetsHeading);

  const assetLinks = document.createElement("div");
  assetLinks.className = "asset-links";

  let assetCount = 0;
  for (const [label, key] of ASSET_FIELDS) {
    const url = normalizeText(country[key]);
    if (!url) {
      continue;
    }
    const link = document.createElement("a");
    link.className = "asset-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    assetLinks.append(link);
    assetCount += 1;
  }

  if (!assetCount) {
    const note = document.createElement("p");
    note.textContent = "No linked assets were listed for this country.";
    assets.append(note);
  } else {
    assets.append(assetLinks);
  }

  const workbookSection = document.createElement("article");
  workbookSection.className = "detail-section";
  workbookSection.innerHTML = "<h4>Country Compliance Requirements</h4>";

  const workbookList = document.createElement("dl");
  workbookList.className = "detail-list";
  workbookList.append(
    createDetailItem("Entry Count", unified.workbook.summary.entry_count),
    createDetailItem("Product Types", unified.workbook.summary.product_types.join(", ")),
    createDetailItem("Agencies", unified.workbook.summary.agencies.join(", ")),
    createDetailItem("Support Contacts", unified.workbook.summary.support_contacts.join(", "))
  );
  workbookSection.append(workbookList);
  workbookSection.append(renderWorkbookTable(unified.workbook.entries));

  grid.append(workbookSection);

  if (unified.workbook.comments.length) {
    const commentSection = document.createElement("article");
    commentSection.className = "detail-section";
    commentSection.innerHTML = "<h4>Workbook Comments</h4>";
    commentSection.append(renderCommentList(unified.workbook.comments));
    grid.append(commentSection);
  }

  if (unified.hardware_handbook.approvals.length) {
    const handbookSection = document.createElement("article");
    handbookSection.className = "detail-section";
    handbookSection.innerHTML = "<h4>Compliance Requirements for Hardware</h4>";
    handbookSection.append(renderHandbookApprovals(unified.hardware_handbook.approvals));
    grid.append(handbookSection);
  }

  elements.detailsContent.append(hero, grid, assets);

  if (elements.detailsDialog.hasAttribute("open") && typeof elements.detailsDialog.close === "function") {
    elements.detailsDialog.close();
  }

  if (typeof elements.detailsDialog.showModal === "function") {
    elements.detailsDialog.showModal();
  } else {
    elements.detailsDialog.setAttribute("open", "open");
  }
}

function closeDetails() {
  if (typeof elements.detailsDialog.close === "function" && elements.detailsDialog.hasAttribute("open")) {
    elements.detailsDialog.close();
    return;
  }
  elements.detailsDialog.removeAttribute("open");
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

  elements.closeDialog.addEventListener("click", closeDetails);
  elements.detailsDialog.addEventListener("click", (event) => {
    const box = elements.detailsShell.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) {
      closeDetails();
    }
  });
}

async function init() {
  attachEvents();

  try {
    const response = await fetch("./data/country_compliance_database.json");
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`);
    }

    const dataset = await response.json();
    state.dataset = dataset;
    state.countries = dataset.countries
      .filter((country) => country.nemko)
      .map((country) => enrichCountry({ ...country.nemko, unified: country }));
    renderStats(dataset);
    applyFilters();
  } catch (error) {
    elements.resultCount.textContent = "Unable to load country data.";
    elements.cardGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

init();
