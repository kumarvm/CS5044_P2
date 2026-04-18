//Promise needs to make sure map loads first, before nodes
Promise.all([
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  d3.csv("cleaned_data.csv")
]).then(([geo, data]) => {

  data.forEach(d => {
    d.lat = +d.Latitude;
    d.lon = +d.Longitude;
    d.speakers = +d["Number of speakers"];
  });

  const uniqueData = Array.from(
    d3.group(data, d => d["Name in English"]).values(),
    d => d[0]
  );

  drawMap(uniqueData, geo);
});

function drawMap(data, geo) {

  const width = window.innerWidth;
  const height = window.innerHeight;

  const mapSvg = d3.select("#map")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoMercator()
    .scale(120)
    .translate([width / 2, height / 1.5]);

  const path = d3.geoPath().projection(projection);

  mapSvg.selectAll("path")
    .data(geo.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#eee")
    .attr("stroke", "#999");

  const sizeScale = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.speakers)])
    .range([3, 15]);

  const nodes = mapSvg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", d => sizeScale(d.speakers))
    .attr("fill", "steelblue")
    .attr("opacity", 0.8);

  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  nodes
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("r", sizeScale(d.speakers) * 1.5)
        .attr("fill", "orange");

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d["Name in English"]}</strong><br/>
          Speakers: ${d.speakers.toLocaleString()}
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("r", d => sizeScale(d.speakers))
        .attr("fill", "steelblue");

      tooltip.style("opacity", 0);
    });
}