
const ENDANGERMENT_LEVELS = [
  "Vulnerable",
  "Definitely endangered",
  "Severely endangered",
  "Critically endangered",
  "Extinct"
];

// Sequential ordinal palette, low -> high severity.
const ENDANGERMENT_COLOR = d3.scaleOrdinal()
  .domain(ENDANGERMENT_LEVELS)
  .range(["#fee08b", "#fdae61", "#f46d43", "#d73027", "#7f0000"]);


const COUNTRY_CONTINENT = {
  // Europe
  "Italy": "Europe", "Germany": "Europe", "France": "Europe", "Spain": "Europe",
  "Portugal": "Europe", "United Kingdom of Great Britain and Northern Ireland": "Europe",
  "Ireland": "Europe", "Iceland": "Europe", "Netherlands": "Europe", "Belgium": "Europe",
  "Luxembourg": "Europe", "Switzerland": "Europe", "Austria": "Europe",
  "Denmark": "Europe", "Sweden": "Europe", "Norway": "Europe", "Finland": "Europe",
  "Estonia": "Europe", "Latvia": "Europe", "Lithuania": "Europe", "Poland": "Europe",
  "Czech Republic": "Europe", "Slovakia": "Europe", "Hungary": "Europe",
  "Romania": "Europe", "Bulgaria": "Europe", "Greece": "Europe",
  "Belarus": "Europe", "Ukraine": "Europe", "Moldova": "Europe",
  "Russian Federation": "Europe",
  "Serbia": "Europe", "Croatia": "Europe", "Slovenia": "Europe",
  "Bosnia and Herzegovina": "Europe", "Montenegro": "Europe", "Albania": "Europe",
  "The former Yugoslav Republic of Macedonia": "Europe", "San Marino": "Europe",
  "Malta": "Europe", "Cyprus": "Europe", "Andorra": "Europe",
  // Asia
  "China": "Asia", "India": "Asia", "Japan": "Asia", "Indonesia": "Asia",
  "Philippines": "Asia", "Viet Nam": "Asia", "Vietnam": "Asia",
  "Thailand": "Asia", "Myanmar": "Asia", "Malaysia": "Asia", "Singapore": "Asia",
  "Cambodia": "Asia", "Lao People's Democratic Republic": "Asia",
  "Nepal": "Asia", "Bangladesh": "Asia", "Pakistan": "Asia", "Sri Lanka": "Asia",
  "Afghanistan": "Asia", "Iran (Islamic Republic of)": "Asia", "Iraq": "Asia",
  "Turkey": "Asia", "Syrian Arab Republic": "Asia", "Lebanon": "Asia",
  "Israel": "Asia", "Palestine": "Asia", "Jordan": "Asia",
  "Saudi Arabia": "Asia", "Yemen": "Asia", "Oman": "Asia",
  "United Arab Emirates": "Asia", "Kuwait": "Asia", "Qatar": "Asia", "Bahrain": "Asia",
  "Armenia": "Asia", "Azerbaijan": "Asia", "Georgia": "Asia",
  "Kazakhstan": "Asia", "Kyrgyzstan": "Asia", "Tajikistan": "Asia",
  "Turkmenistan": "Asia", "Uzbekistan": "Asia", "Mongolia": "Asia",
  "Democratic People's Republic of Korea": "Asia", "Republic of Korea": "Asia",
  "Bhutan": "Asia", "Maldives": "Asia", "Brunei Darussalam": "Asia",
  "Timor-Leste": "Asia", "Taiwan, Province of China": "Asia",
  // Africa
  "Nigeria": "Africa", "Ethiopia": "Africa", "Egypt": "Africa", "South Africa": "Africa",
  "Kenya": "Africa", "Tanzania, United Republic of": "Africa", "Uganda": "Africa",
  "Ghana": "Africa", "Algeria": "Africa", "Morocco": "Africa", "Tunisia": "Africa",
  "Libya": "Africa", "Sudan": "Africa", "South Sudan": "Africa", "Chad": "Africa",
  "Niger": "Africa", "Mali": "Africa", "Mauritania": "Africa", "Senegal": "Africa",
  "Gambia": "Africa", "Guinea": "Africa", "Guinea-Bissau": "Africa",
  "Sierra Leone": "Africa", "Liberia": "Africa", "Côte d'Ivoire": "Africa",
  "Burkina Faso": "Africa", "Togo": "Africa", "Benin": "Africa",
  "Cameroon": "Africa", "Central African Republic": "Africa", "Gabon": "Africa",
  "Congo": "Africa", "Democratic Republic of the Congo": "Africa",
  "Angola": "Africa", "Zambia": "Africa", "Zimbabwe": "Africa",
  "Botswana": "Africa", "Namibia": "Africa", "Mozambique": "Africa",
  "Malawi": "Africa", "Madagascar": "Africa", "Mauritius": "Africa",
  "Eritrea": "Africa", "Djibouti": "Africa", "Somalia": "Africa",
  "Rwanda": "Africa", "Burundi": "Africa", "Lesotho": "Africa",
  "Swaziland": "Africa", "Eswatini": "Africa", "Equatorial Guinea": "Africa",
  "Sao Tome and Principe": "Africa", "Cabo Verde": "Africa", "Cape Verde": "Africa",
  "Comoros": "Africa", "Seychelles": "Africa",
  // Americas
  "United States of America": "Americas", "Canada": "Americas", "Mexico": "Americas",
  "Brazil": "Americas", "Argentina": "Americas", "Chile": "Americas", "Peru": "Americas",
  "Colombia": "Americas", "Venezuela (Bolivarian Republic of)": "Americas",
  "Bolivia (Plurinational State of)": "Americas", "Ecuador": "Americas",
  "Paraguay": "Americas", "Uruguay": "Americas", "Guyana": "Americas",
  "Suriname": "Americas", "French Guiana": "Americas",
  "Cuba": "Americas", "Haiti": "Americas", "Dominican Republic": "Americas",
  "Jamaica": "Americas", "Trinidad and Tobago": "Americas", "Bahamas": "Americas",
  "Barbados": "Americas", "Guatemala": "Americas", "Honduras": "Americas",
  "El Salvador": "Americas", "Nicaragua": "Americas", "Costa Rica": "Americas",
  "Panama": "Americas", "Belize": "Americas",
  // Oceania
  "Australia": "Oceania", "New Zealand": "Oceania", "Papua New Guinea": "Oceania",
  "Fiji": "Oceania", "Solomon Islands": "Oceania", "Vanuatu": "Oceania",
  "Samoa": "Oceania", "Tonga": "Oceania", "Kiribati": "Oceania", "Tuvalu": "Oceania",
  "Nauru": "Oceania", "Palau": "Oceania", "Marshall Islands": "Oceania",
  "Micronesia (Federated States of)": "Oceania", "Cook Islands": "Oceania",
  "New Caledonia": "Oceania", "French Polynesia": "Oceania"
};

const state = {
  endangermentActive: new Set(ENDANGERMENT_LEVELS),
  minSpeakersSlider: 0, // 0-100, log-mapped to actual speakers
  minSpeakers: 0,
  continent: "all",
  showNeighbourLinks: true
};

let allLanguages = [];
let maxSpeakers = 1;

const Coordinator = {
  async start() {
    const [geo, raw] = await Promise.all([
      d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
      d3.csv("cleaned_data.csv")
    ]);

    const byId = d3.group(raw, d => d.ID);
    allLanguages = Array.from(byId, ([id, rows]) => {
      const r0 = rows[0];
      const countries = Array.from(new Set(
        rows.map(r => (r.Countries || "").trim()).filter(Boolean)
      ));
      var isoCodes = Array.from(new Set(
        rows.map(r => (r["ISO639-3 codes"] || "").trim())
          .filter(code => code && code !== "" && code !== "None")
      ));

      if (isoCodes.length == 0) {
        isoCodes = "None found"
      }
      
      return {
        id,
        name: r0["Name in English"],
        nativeName: r0["Name in the language"],
        altNames: r0["Alternate names"],
        countries,
        endangerment: r0["Degree of endangerment"],
        speakers: +r0["Number of speakers"] || 0,
        lat: +r0.Latitude,
        lon: +r0.Longitude,
        locDesc: r0['Description of the location'] || "No description given",
        iso: isoCodes || "None found"
      };
    }).filter(d => !isNaN(d.lat) && !isNaN(d.lon));

    maxSpeakers = d3.max(allLanguages, d => d.speakers) || 1;

    initControls();
    MapView.init(geo);
    NetworkView.init();
    ChartView.init();
    this.applyFilters();
  },

  applyFilters() {
    const filtered = allLanguages.filter(d => {
      if (!state.endangermentActive.has(d.endangerment)) return false;
      if (d.speakers < state.minSpeakers) return false;
      if (state.continent !== "all") {
        const anyMatch = d.countries.some(c => COUNTRY_CONTINENT[c] === state.continent);
        if (!anyMatch) return false;
      }
      return true;
    });
    d3.select("#count-display").text(
      `${filtered.length.toLocaleString()} languages`
    );
    MapView.update(filtered);
    NetworkView.update(filtered);
    ChartView.update(filtered);
  },

  hoverCountry(country) {
    MapView.highlightCountry(country);
    NetworkView.highlightCountry(country);
    ChartView.highlightCountry(country);
  },

  hoverLanguage(langId) {
    MapView.highlightLanguage(langId);
    NetworkView.highlightLanguage(langId);
  },

  clickLanguage(d) {
    d3.select("#details").html(`
      <h3>${d.name}${d.nativeName ? ` — <em>${d.nativeName}</em>` : ""}</h3>
      <p><strong>Endangerment:</strong> ${d.endangerment}</p>
      <p><strong>Speakers:</strong> ${d.speakers.toLocaleString()}</p>
      <p><strong>Countries:</strong> ${d.countries.join(", ") || "—"}</p>
      ${d.altNames ? `<p><strong>Also known as:</strong> ${d.altNames}</p>` : ""}
      <p><strong>ISO639-3 Codes:</strong> ${d.iso}</p>
      <p><strong>Location Description:</strong> ${d.locDesc}</p>
    `);
  },

  clickCountry(node) {
    const langNames = Array.from(node.langs.values()).map(l => l.name).sort();
    d3.select("#details").html(`
      <h3>${node.id}</h3>
      <p><strong>Endangered languages:</strong> ${node.count}</p>
      <p><strong>Shared with:</strong> ${node.neighbours.size} other countries</p>
      <p>${langNames.slice(0, 30).join(", ")}${langNames.length > 30 ? ", …" : ""}</p>
    `);

    ChartView.highlightCountry(node.id);
  }
};

function initControls() {
  // Endangerment checkboxes
  const endDiv = d3.select("#endangerment-filters");
  ENDANGERMENT_LEVELS.forEach(level => {
    const label = endDiv.append("label");
    label.append("input")
      .attr("type", "checkbox")
      .property("checked", true)
      .on("change", function() {
        if (this.checked) state.endangermentActive.add(level);
        else state.endangermentActive.delete(level);
        Coordinator.applyFilters();
      });
    label.append("span").attr("class", "swatch")
      .style("background", ENDANGERMENT_COLOR(level));
    label.append("span").text(level);
  });

  // Speakers slider — log-mapped so low-speaker languages are easy to isolate.
  const sliderToSpeakers = v => {
    if (v <= 0) return 0;
    return Math.round(Math.pow(maxSpeakers, v / 100));
  };
  d3.select("#speakers-min")
    .on("input", function() {
      state.minSpeakersSlider = +this.value;
      state.minSpeakers = sliderToSpeakers(+this.value);
      d3.select("#speakers-min-val").text(state.minSpeakers.toLocaleString());
      Coordinator.applyFilters();
    });
  d3.select("#speakers-min-val").text("0");

  // Continent dropdown
  d3.select("#continent-filter")
    .on("change", function() {
      state.continent = this.value;
      Coordinator.applyFilters();
    });

  // Closest-neighbour link overlay toggle
  d3.select("#neighbour-toggle")
    .on("change", function() {
      state.showNeighbourLinks = this.checked;
      Coordinator.applyFilters();
    });
}
