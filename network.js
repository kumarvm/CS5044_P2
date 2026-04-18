d3.csv("cleaned_data.csv").then(data => {
  const countrySet = new Set();
  const languageSet = new Set();
  const links = [];

  //Creates sets for language and country nodes
  data.forEach(d => {
    const country = d["Countries"];
    const language = d["Name in English"];

    countrySet.add(country);
    languageSet.add(language);

    links.push({
      source: country,
      target: language
    });
  });

  drawNetwork(
    Array.from(countrySet),
    Array.from(languageSet),
    links
  );
});

//Draws the network via a node-link simulation
function drawNetwork(countries, languages, links) {

  const width = window.innerWidth;
  const height = window.innerHeight;
  const svg = d3.select("#network")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g");

  svg.call(
    d3.zoom()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
  );

  const nodes = [];

  countries.forEach(c => nodes.push({ id: c, type: "country" }));
  languages.forEach(l => nodes.push({ id: l, type: "language" }));

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.id)
      .distance(60)
    )
    .force("charge", d3.forceManyBody().strength(-120))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(6));

  const link = g.selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#aaa");

  const node = g.selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", d => d.type === "country" ? 8 : 5)
    .attr("fill", d => d.type === "country" ? "orange" : "steelblue")
    .call(
      d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  const label = g.selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text(d => d.id)
    .style("font-size", d => d.type === "country" ? "11px" : "9px")
    .style("font-weight", d => d.type === "country" ? "bold" : "normal")
    .style("fill", d => d.type === "country" ? "#000" : "#444")
    .style("pointer-events", "none");

  simulation.on("tick", () => {

    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x + 6)
      .attr("y", d => d.y + 3);
  });

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}