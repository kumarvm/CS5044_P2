// map.js — geographic view. Exposes MapView.{init, update, highlightCountry, highlightLanguage}.
// Each language is linked to its single nearest neighbour, where distance combines
// geographic proximity with similarity in speaker count (log-scaled).

const MapView = (() => {
  let svg, g, projection, tooltip;
  let linksGroup, circlesGroup;
  let currentLinks = [];

  // Weight for the two components of the neighbour distance metric.
  // 1.0 = pure geography, 0.0 = pure speaker-count similarity.
  const GEO_WEIGHT = 0.75;

  function init(geo) {
    svg = d3.select("#map");
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    projection = d3.geoMercator().fitSize([width, height], geo);
    const path = d3.geoPath().projection(projection);

    g = svg.append("g");

    svg.call(d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", e => g.attr("transform", e.transform))
    );

    g.append("g").attr("class", "countries")
      .selectAll("path")
      .data(geo.features)
      .enter().append("path")
      .attr("class", "map-country")
      .attr("d", path);

    linksGroup = g.append("g").attr("class", "neighbour-links");
    circlesGroup = g.append("g").attr("class", "language-markers");

    tooltip = d3.select("body").select(".tooltip").empty()
      ? d3.select("body").append("div").attr("class", "tooltip")
      : d3.select("body").select(".tooltip");
  }

  function computeNearestLinks(data) {
    if (data.length < 2) return [];
    const maxGeo = Math.hypot(360, 180);
    const logMaxSp = Math.log((d3.max(data, d => d.speakers) || 1) + 1) || 1;

    function score(a, b) {
      const geo = Math.hypot(a.lon - b.lon, a.lat - b.lat) / maxGeo;
      const sp = Math.abs(Math.log(a.speakers + 1) - Math.log(b.speakers + 1)) / logMaxSp;
      return GEO_WEIGHT * geo + (1 - GEO_WEIGHT) * sp;
    }

    const seen = new Set();
    const links = [];
    for (const a of data) {
      let best = null, bestScore = Infinity;
      for (const b of data) {
        if (a === b) continue;
        const s = score(a, b);
        if (s < bestScore) { bestScore = s; best = b; }
      }
      if (!best) continue;
      const key = a.id < best.id ? a.id + "|" + best.id : best.id + "|" + a.id;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ id: key, source: a, target: best });
    }
    return links;
  }

  function update(data) {
    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(data, d => d.speakers) || 1])
      .range([2, 14]);

    currentLinks = state.showNeighbourLinks ? computeNearestLinks(data) : [];
    const linkSel = linksGroup.selectAll("line.neighbour-link")
      .data(currentLinks, d => d.id);
    linkSel.exit().remove();
    linkSel.enter().append("line")
      .attr("class", "neighbour-link")
      .merge(linkSel)
      .attr("x1", d => projection([d.source.lon, d.source.lat])[0])
      .attr("y1", d => projection([d.source.lon, d.source.lat])[1])
      .attr("x2", d => projection([d.target.lon, d.target.lat])[0])
      .attr("y2", d => projection([d.target.lon, d.target.lat])[1]);

    const sel = circlesGroup.selectAll("circle.language-circle")
      .data(data, d => d.id);
    sel.exit().remove();

    const enter = sel.enter().append("circle")
      .attr("class", "language-circle")
      .attr("opacity", 0.85)
      .on("mouseover", (_event, d) => {
        tooltip.style("opacity", 1).html(`
          <strong>${d.name}</strong><br>
          ${d.endangerment}<br>
          Speakers: ${d.speakers.toLocaleString()}<br>
          ${d.countries.join(", ")}
        `);
        Coordinator.hoverLanguage(d.id);
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 12) + "px")
               .style("top", (event.pageY + 12) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
        Coordinator.hoverLanguage(null);
      })
      .on("click", (_event, d) => Coordinator.clickLanguage(d));

    enter.merge(sel)
      .attr("cx", d => projection([d.lon, d.lat])[0])
      .attr("cy", d => projection([d.lon, d.lat])[1])
      .attr("r", d => sizeScale(d.speakers))
      .attr("fill", d => ENDANGERMENT_COLOR(d.endangerment));
  }

  function highlightCountry(country) {
    const circles = circlesGroup.selectAll("circle.language-circle");
    const lines = linksGroup.selectAll("line.neighbour-link");
    if (!country) {
      circles.classed("dim", false).classed("highlight", false);
      lines.classed("dim", false).classed("highlight", false);
      return;
    }
    const inCountry = d => d.countries.includes(country);
    circles.classed("highlight", inCountry).classed("dim", d => !inCountry(d));
    lines
      .classed("highlight", d => inCountry(d.source) && inCountry(d.target))
      .classed("dim", d => !inCountry(d.source) && !inCountry(d.target));
  }

  function highlightLanguage(langId) {
    const circles = circlesGroup.selectAll("circle.language-circle");
    const lines = linksGroup.selectAll("line.neighbour-link");
    if (!langId) {
      circles.classed("dim", false).classed("highlight", false);
      lines.classed("dim", false).classed("highlight", false);
      return;
    }
    circles.classed("highlight", d => d.id === langId)
           .classed("dim", d => d.id !== langId);
    lines
      .classed("highlight", d => d.source.id === langId || d.target.id === langId)
      .classed("dim", d => d.source.id !== langId && d.target.id !== langId);
  }

  return { init, update, highlightCountry, highlightLanguage };
})();
