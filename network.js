// network.js — bipartite country ↔ language graph.
// Country nodes (orange) are linked to each endangered language (coloured by endangerment).
// Exposes NetworkView.{init, update, highlightCountry, highlightLanguage}.

const NetworkView = (() => {
  let svg, g, width, height;
  let simulation, linkSel, nodeSel, labelSel, tooltip;
  let countryMeta = new Map(); // country -> { id, langs: Map(langId -> lang), count, neighbours: Set }

  function init() {
    svg = d3.select("#network");
    width = svg.node().clientWidth;
    height = svg.node().clientHeight;

    g = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.2, 5]).on("zoom", e => g.attr("transform", e.transform)));

    simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.nodeId).distance(55))
      .force("charge", d3.forceManyBody().strength(-110))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => d.r + 1))
      .on("tick", tick);

    tooltip = d3.select("body").select(".tooltip").empty()
      ? d3.select("body").append("div").attr("class", "tooltip")
      : d3.select("body").select(".tooltip");
  }

  function update(data) {
    // Country-level metadata (used by click handler and highlighting).
    countryMeta = new Map();
    data.forEach(lang => {
      lang.countries.forEach(c => {
        if (!countryMeta.has(c)) {
          countryMeta.set(c, { id: c, langs: new Map(), neighbours: new Set() });
        }
        countryMeta.get(c).langs.set(lang.id, lang);
      });
    });
    countryMeta.forEach(meta => { meta.count = meta.langs.size; });
    // neighbours = other countries that share ≥1 language
    data.forEach(lang => {
      if (lang.countries.length < 2) return;
      lang.countries.forEach(a => lang.countries.forEach(b => {
        if (a !== b && countryMeta.has(a) && countryMeta.has(b)) {
          countryMeta.get(a).neighbours.add(b);
        }
      }));
    });

    // Build bipartite nodes and links.
    const nodes = [];
    countryMeta.forEach(meta => {
      nodes.push({
        nodeId: "C::" + meta.id,
        type: "country",
        id: meta.id,
        meta,
        r: Math.min(14, Math.sqrt(meta.count) * 2 + 5)
      });
    });
    data.forEach(lang => {
      nodes.push({
        nodeId: "L::" + lang.id,
        type: "language",
        id: lang.id,
        lang,
        r: 4
      });
    });

    const links = [];
    data.forEach(lang => {
      lang.countries.forEach(c => {
        if (countryMeta.has(c)) {
          links.push({ source: "C::" + c, target: "L::" + lang.id });
        }
      });
    });

    // Links
    linkSel = g.selectAll("line.bi-link")
      .data(links, d => (d.source.nodeId || d.source) + "->" + (d.target.nodeId || d.target));
    linkSel.exit().remove();
    linkSel = linkSel.enter().append("line")
      .attr("class", "bi-link country-link")
      .attr("stroke", "#bbb")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 1)
      .merge(linkSel);

    // Nodes
    nodeSel = g.selectAll("circle.bi-node")
      .data(nodes, d => d.nodeId);
    nodeSel.exit().remove();

    const nodeEnter = nodeSel.enter().append("circle")
      .attr("class", d => "bi-node " + (d.type === "country" ? "country-node" : "language-circle"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end",   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("mouseover", (_event, d) => {
        if (d.type === "country") {
          tooltip.style("opacity", 1).html(`
            <strong>${d.id}</strong><br>
            Endangered languages: ${d.meta.count}<br>
            Shared with ${d.meta.neighbours.size} countr${d.meta.neighbours.size === 1 ? "y" : "ies"}
          `);
          Coordinator.hoverCountry(d.id);
        } else {
          const lang = d.lang;
          tooltip.style("opacity", 1).html(`
            <strong>${lang.name}</strong><br>
            ${lang.endangerment}<br>
            Speakers: ${lang.speakers.toLocaleString()}<br>
            ${lang.countries.join(", ")}
          `);
          Coordinator.hoverLanguage(lang.id);
        }
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 12) + "px")
               .style("top", (event.pageY + 12) + "px");
      })
      .on("mouseout", (_event, d) => {
        tooltip.style("opacity", 0);
        if (d.type === "country") Coordinator.hoverCountry(null);
        else Coordinator.hoverLanguage(null);
      })
      .on("click", (_event, d) => {
        if (d.type === "country") Coordinator.clickCountry(d.meta);
        else Coordinator.clickLanguage(d.lang);
      });

    nodeSel = nodeEnter.merge(nodeSel)
      .attr("r", d => d.r)
      .attr("fill", d => d.type === "country"
        ? "#e67c26"
        : ENDANGERMENT_COLOR(d.lang.endangerment));

    // Labels (country names only — ~200 labels vs thousands)
    labelSel = g.selectAll("text.country-label")
      .data(nodes.filter(n => n.type === "country"), d => d.nodeId);
    labelSel.exit().remove();
    labelSel = labelSel.enter().append("text")
      .attr("class", "country-label")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .style("pointer-events", "none")
      .merge(labelSel)
      .text(d => shortName(d.id));

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(0.9).restart();
  }

  function tick() {
    if (linkSel) linkSel
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    if (nodeSel) nodeSel.attr("cx", d => d.x).attr("cy", d => d.y);
    if (labelSel) labelSel.attr("x", d => d.x + d.r + 2).attr("y", d => d.y + 3);
  }

  function highlightCountry(country) {
    if (!nodeSel) return;
    if (!country) {
      nodeSel.classed("dim", false).classed("highlight", false);
      if (linkSel) linkSel.classed("dim", false);
      if (labelSel) labelSel.classed("dim", false);
      return;
    }
    const meta = countryMeta.get(country);
    const keepLangs = meta ? meta.langs : new Map();
    nodeSel
      .classed("highlight", d => d.type === "country" && d.id === country)
      .classed("dim", d => {
        if (d.type === "country") return d.id !== country;
        return !keepLangs.has(d.id);
      });
    if (linkSel) linkSel.classed("dim", d =>
      (d.source.id || d.source).replace(/^C::/, "") !== country
    );
    if (labelSel) labelSel.classed("dim", d => d.id !== country);
  }

  function highlightLanguage(langId) {
    if (!nodeSel) return;
    if (!langId) {
      nodeSel.classed("dim", false).classed("highlight", false);
      if (linkSel) linkSel.classed("dim", false);
      if (labelSel) labelSel.classed("dim", false);
      return;
    }
    // Countries connected to this language
    const countriesForLang = new Set();
    countryMeta.forEach((meta, c) => { if (meta.langs.has(langId)) countriesForLang.add(c); });
    nodeSel
      .classed("highlight", d => d.type === "language" && d.id === langId)
      .classed("dim", d => {
        if (d.type === "language") return d.id !== langId;
        return !countriesForLang.has(d.id);
      });
    if (linkSel) linkSel.classed("dim", d =>
      (d.target.id || d.target).replace(/^L::/, "") !== langId
    );
    if (labelSel) labelSel.classed("dim", d => !countriesForLang.has(d.id));
  }

  function shortName(name) {
    return name
      .replace("United Kingdom of Great Britain and Northern Ireland", "UK")
      .replace("United States of America", "USA")
      .replace("Russian Federation", "Russia")
      .replace("Iran (Islamic Republic of)", "Iran")
      .replace("Bolivia (Plurinational State of)", "Bolivia")
      .replace("Venezuela (Bolivarian Republic of)", "Venezuela")
      .replace("Democratic Republic of the Congo", "DR Congo")
      .replace("Democratic People's Republic of Korea", "North Korea")
      .replace("Republic of Korea", "South Korea")
      .replace("Lao People's Democratic Republic", "Laos")
      .replace("Syrian Arab Republic", "Syria")
      .replace("Tanzania, United Republic of", "Tanzania")
      .replace("The former Yugoslav Republic of Macedonia", "North Macedonia")
      .replace("Micronesia (Federated States of)", "Micronesia")
      .replace("Taiwan, Province of China", "Taiwan");
  }

  return { init, update, highlightCountry, highlightLanguage };
})();
