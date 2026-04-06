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
  { title: "Energy Efficiency", fields: [["Requirements", "energy_efficiency_requirements"]] },
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

function emptyDisplay(value) {
  return (value || "").trim() || "Not listed";
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
    <thead><tr><th>Product</th><th>Agency</th><th>Approval Need</th><th>Cost</th><th>Samples</th><th>Lead Time</th><th>Validity</th><th>Recert</th></tr></thead>
    <tbody></tbody>`;
  const tbody = table.querySelector("tbody");
  for (const entry of entries) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${emptyDisplay(entry.product_type)}</strong><div class="table-subline">${emptyDisplay(entry.support_contact)}</div></td>
      <td>${emptyDisplay(entry.agency)}</td>
      <td>${emptyDisplay(entry.comment)}</td>
      <td><div>${emptyDisplay(entry.cost_per_certificate)}</div><div class="table-subline">Add'l COO: ${emptyDisplay(entry.cost_for_additional_country_of_origin)}</div></td>
      <td><div>${emptyDisplay(entry.sample_needed_for_certification)}</div><div class="table-subline">Recert: ${emptyDisplay(entry.sample_needed_for_recertification)}</div></td>
      <td><div>Cert: ${emptyDisplay(entry.lead_time_for_certification_months)}</div><div class="table-subline">Sample: ${emptyDisplay(entry.lead_time_for_sample_months)}</div></td>
      <td>${emptyDisplay(entry.certificate_validity_years)}</td>
      <td><div>${emptyDisplay(entry.recertification_cost)}</div><div class="table-subline">LT: ${emptyDisplay(entry.lead_time_for_recertification_months)}</div></td>`;
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
    const standards = (approval.standards || []).map((item) => `<div class="detail-item"><dt>${emptyDisplay(item.category)}</dt><dd>${emptyDisplay(item.standard_specification)}</dd></div>`).join("");
    block.innerHTML = `
      <div class="handbook-header"><h5>${emptyDisplay(approval.business_unit)}</h5><span class="timeline-pill">${emptyDisplay(approval.timeline || "No timeline listed")}</span></div>
      <p class="table-note">${emptyDisplay(approval.comments || approval.country_group)}</p>
      <dl class="detail-list"><div class="detail-item"><dt>Country Group</dt><dd>${emptyDisplay(approval.country_group)}</dd></div>${standards}</dl>`;
    wrap.append(block);
  }
  return wrap;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("country");
  const title = document.getElementById("country-title");
  const subtitle = document.getElementById("country-subtitle");
  const content = document.getElementById("country-content");
  const statEntries = document.getElementById("stat-entries");
  const statUnits = document.getElementById("stat-units");
  const jsonLink = document.getElementById("country-json-link");

  if (!slug) {
    title.textContent = "Country not specified";
    subtitle.textContent = "Use the directory to open a country page.";
    return;
  }

  try {
    const response = await fetch(`./data/countries/${slug}.json`);
    if (!response.ok) throw new Error(`Failed to load ${slug}`);
    const country = await response.json();
    const nemko = country.nemko || {};

    title.textContent = country.country;
    subtitle.textContent = emptyDisplay(nemko.regulatory_authority);
    jsonLink.href = `./data/${country.country_file}`;
    statEntries.textContent = String(country.workbook.summary.entry_count);
    statUnits.textContent = String(country.hardware_handbook.approvals.length);

    const hero = document.createElement("section");
    hero.className = "detail-hero";
    hero.innerHTML = `
      <div>
        <p class="eyebrow">Requirement Detail</p>
        <h3>${country.country}</h3>
        <p class="lede">${emptyDisplay(nemko.regulatory_authority)}</p>
      </div>
      ${nemko.flag_image_url ? `<img class="flag-image" src="${nemko.flag_image_url}" alt="${country.country} flag">` : ""}`;

    const grid = document.createElement("section");
    grid.className = "detail-grid";
    for (const section of DETAIL_SECTIONS) {
      const block = document.createElement("article");
      block.className = "detail-section";
      const heading = document.createElement("h4");
      heading.textContent = section.title;
      const list = document.createElement("dl");
      list.className = "detail-list";
      for (const [label, key] of section.fields) {
        list.append(createDetailItem(label, nemko[key]));
      }
      block.append(heading, list);
      grid.append(block);
    }

    const assets = document.createElement("article");
    assets.className = "detail-section";
    assets.innerHTML = "<h4>Linked Assets</h4>";
    const assetLinks = document.createElement("div");
    assetLinks.className = "asset-links";
    for (const [label, key] of ASSET_FIELDS) {
      const url = (nemko[key] || "").trim();
      if (!url) continue;
      const link = document.createElement("a");
      link.className = "asset-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = label;
      assetLinks.append(link);
    }
    assets.append(assetLinks.childElementCount ? assetLinks : Object.assign(document.createElement("p"), { className: "table-note", textContent: "No linked assets were listed for this country." }));

    const workbookSection = document.createElement("article");
    workbookSection.className = "detail-section";
    workbookSection.innerHTML = "<h4>Country Compliance Requirements</h4>";
    const workbookList = document.createElement("dl");
    workbookList.className = "detail-list";
    workbookList.append(
      createDetailItem("Entry Count", country.workbook.summary.entry_count),
      createDetailItem("Product Types", country.workbook.summary.product_types.join(", ")),
      createDetailItem("Agencies", country.workbook.summary.agencies.join(", ")),
      createDetailItem("Support Contacts", country.workbook.summary.support_contacts.join(", "))
    );
    workbookSection.append(workbookList, renderWorkbookTable(country.workbook.entries));
    grid.append(workbookSection);

    if (country.workbook.comments.length) {
      const commentSection = document.createElement("article");
      commentSection.className = "detail-section";
      commentSection.innerHTML = "<h4>Workbook Comments</h4>";
      commentSection.append(renderCommentList(country.workbook.comments));
      grid.append(commentSection);
    }

    if (country.hardware_handbook.approvals.length) {
      const handbookSection = document.createElement("article");
      handbookSection.className = "detail-section";
      handbookSection.innerHTML = "<h4>Compliance Requirements for Hardware</h4>";
      handbookSection.append(renderHandbookApprovals(country.hardware_handbook.approvals));
      grid.append(handbookSection);
    }

    content.replaceChildren(hero, grid, assets);
  } catch (error) {
    title.textContent = "Country detail unavailable";
    subtitle.textContent = String(error.message || error);
  }
}

init();
