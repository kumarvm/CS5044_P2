// map.js — geographic view. Exposes MapView.{init, update, highlightCountry, highlightLanguage}.

const MapView = (() => {
  let svg, g, projection, path, tooltip, circlesGroup;

  function init(geo) {
    svg = d3.select("#map");
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    projection = d3.geoMercator().fitSize([width, height], geo);
    path = d3.geoPath().projection(projection);

    g = svg.append("g");

    // Zoom / pan
    svg.call(d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", e => g.attr("transform", e.transform))
    );

    // Base map
    g.append("g").attr("class", "countries")
      .selectAll("path")
      .data(geo.features)
      .enter().append("path")
      .attr("d", path)
      .attr("fill", "#eee")
      .attr("stroke", "#bbb")
      .attr("stroke-width", 0.5);

    circlesGroup = g.append("g").attr("class", "language-markers");

    tooltip = d3.select("body").select(".tooltip").empty()
      ? d3.select("body").append("div").attr("class", "tooltip")
      : d3.select("body").select(".tooltip");
  }

  function update(data) {
    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(data, d => d.speakers) || 1])
      .range([2, 14]);

    const sel = circlesGroup.selectAll("circle.language-circle")
      .data(data, d => d.id);

    sel.exit().remove();

    const enter = sel.enter().append("circle")
      .attr("class", "language-circle")
      .attr("opacity", 0.8)
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
      .attr("fill", d => ENDANGERMENT_COLOR(d.endangerment))
      .attr("stroke", "rgba(0,0,0,0.25)")
      .attr("stroke-width", 0.5);
  }

  function highlightCountry(country) {
    const sel = circlesGroup.selectAll("circle.language-circle");
    if (!country) {
      sel.classed("dim", false).classed("highlight", false);
      return;
    }
    sel.classed("highlight", d => d.countries.includes(country))
       .classed("dim", d => !d.countries.includes(country));
  }

  function highlightLanguage(langId) {
    const sel = circlesGroup.selectAll("circle.language-circle");
    if (!langId) {
      sel.classed("dim", false).classed("highlight", false);
      return;
    }
    sel.classed("highlight", d => d.id === langId)
       .classed("dim", d => d.id !== langId);
  }

  return { init, update, highlightCountry, highlightLanguage };
})();
