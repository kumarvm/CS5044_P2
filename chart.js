// chart.js — distribution view. Exposes ChartView.{init, update, highlightCountry, highlightLanguage}.

const ChartView = (() => {
  let svg, g, xScale, yScale, tooltip;
  let currentData = [];
  let currentCountry = null;
  let width, height;
  
  const MARGIN = { top: 40, right: 30, bottom: 80, left: 60 };
  const BAR_COLORS = ENDANGERMENT_COLOR;

  function init() {
    svg = d3.select("#chart");
    
    const container = svg.node().parentElement;
    const containerRect = container.getBoundingClientRect();
    width = containerRect.width || 600;
    height = 400;
    
    svg
      .attr("width", width)
      .attr("height", height);

    //Clears any existing content
    svg.selectAll("*").remove();

    g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    //Tooltip — all visual styling comes from the .chart-tooltip CSS class (theme-aware).
    tooltip = d3.select("body").append("div")
      .attr("class", "chart-tooltip")
      .style("visibility", "hidden");
    
    //Sets bar chart styles
    g.append("g").attr("class", "x-axis");
    g.append("g").attr("class", "y-axis");
    
    g.append("text")
      .attr("class", "axis-label x-label")
      .attr("x", (width - MARGIN.left - MARGIN.right) / 2)
      .attr("y", height - MARGIN.bottom + 35)
      .attr("text-anchor", "middle")
      .text("Endangerment Level");

    g.append("text")
      .attr("class", "axis-label y-label")
      .attr("x", -35)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .text("Number of Languages");
    
    //Handles resizing
    window.addEventListener("resize", () => {
      if (currentData) {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
          const newRect = container.getBoundingClientRect();
          width = newRect.width || 600;
          svg.attr("width", width);
          update(currentData);
        }, 250);
      }
    });
  }

  function update(data) {
    if (!svg) {
      init();
    }
    
    currentData = data;
    
    //Updates the chart title in the parent view
    const viewDiv = d3.select("#chart").node().parentElement;
    let titleElement = d3.select(viewDiv).select("h2");
    if (!titleElement.empty()) {
      if (!currentCountry) {
        titleElement.html('Distribution of Endangered Languages By Country: <span style="color: #d73027;">Global View</span>'); //default
      } else {
        titleElement.html(`Distribution of Endangered Languages By Country: <span style="color: #d73027;">${currentCountry}</span>`); //for the country
      }
    }
    
    //If no country is selected, global distribution is shown, otherwise the country that is hovered over
    if (!currentCountry) {
      showGlobalDistribution(data);
    } else {
      showCountryDistribution(data, currentCountry);
    }
  }
  
  //Aggregates globally
  function showGlobalDistribution(data) {
    const counts = new Map();
    ENDANGERMENT_LEVELS.forEach(level => counts.set(level, 0));
    
    data.forEach(lang => {
      if (counts.has(lang.endangerment)) {
        counts.set(lang.endangerment, counts.get(lang.endangerment) + 1);
      }
    });
    
    const chartData = ENDANGERMENT_LEVELS.map(level => ({
      level: level,
      count: counts.get(level) || 0,
      color: BAR_COLORS(level)
    }));
    
    drawBars(chartData);
  }
  
  //Aggregates for a given country
  function showCountryDistribution(data, country) {
    //Filters out languages not linked to the given country
    const countryLanguages = data.filter(lang => 
      lang.countries && lang.countries.includes(country)
    );
    
    const counts = new Map();
    ENDANGERMENT_LEVELS.forEach(level => counts.set(level, 0));
    
    countryLanguages.forEach(lang => {
      if (counts.has(lang.endangerment)) {
        counts.set(lang.endangerment, counts.get(lang.endangerment) + 1);
      }
    });
    
    const chartData = ENDANGERMENT_LEVELS.map(level => ({
      level: level,
      count: counts.get(level) || 0,
      color: BAR_COLORS(level),
      languages: countryLanguages.filter(l => l.endangerment === level)
    }));
    
    drawBars(chartData);
  }
  
  //Draws bar chart
  function drawBars(data) {
    if (!g) return;
    
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;
    
    //Scale updates
    xScale = d3.scaleBand()
      .domain(data.map(d => d.level))
      .range([0, innerWidth])
      .padding(0.3);
    
    const maxCount = Math.max(...data.map(d => d.count), 1);
    yScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([innerHeight, 0])
      .nice();
    
    //Axis updates
    const xAxis = d3.axisBottom(xScale)
      .tickValues(ENDANGERMENT_LEVELS)
      .tickFormat(d => {
        if (d === "Definitely endangered") return "Definitely";
        if (d === "Critically endangered") return "Critically";
        if (d === "Severely endangered") return "Severely";
        if (d === "Vulnerable") return "Vulnerable";
        if (d === "Extinct") return "Extinct";
        return d;
      });
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(Math.min(10, maxCount))
      .tickFormat(d => d.toLocaleString());
    
    g.select(".x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.3em")
      .attr("transform", "rotate(-25)");
    
    g.select(".y-axis").call(yAxis);
    
    const barsUpdate = g.selectAll(".bar").data(data);
    
    //Tooltip for bar chart
    barsUpdate.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.level))
      .attr("y", innerHeight)
      .attr("width", xScale.bandwidth())
      .attr("height", 0)
      .attr("fill", d => d.color)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("cursor", "pointer")
      .on("mouseover", function(event, d) {
        let tooltipContent = `<strong>${d.level}</strong><br/>
          ${d.count.toLocaleString()} language${d.count !== 1 ? 's' : ''}`;
        
        if (d.languages && d.languages.length > 0 && d.languages.length <= 5) {
          tooltipContent += `<br/><small>${d.languages.map(l => l.name).join(", ")}</small>`;
        } else if (d.languages && d.languages.length > 5) {
          tooltipContent += `<br/><small>${d.languages.slice(0, 5).map(l => l.name).join(", ")}... (${d.languages.length} total)</small>`;
        }
        
        tooltip.style("visibility", "visible")
          .html(tooltipContent)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.7);
      })
      .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1);
      })
      .merge(barsUpdate)
      .transition()
      .duration(500)
      .attr("x", d => xScale(d.level))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.count))
      .attr("height", d => innerHeight - yScale(d.count));
    
    //Removes old bars
    barsUpdate.exit().remove();
    
    //Labels placed on top of bars
    const labelsUpdate = g.selectAll(".bar-label").data(data);
    
    labelsUpdate.enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => xScale(d.level) + xScale.bandwidth() / 2)
      .attr("y", innerHeight)
      .attr("text-anchor", "middle")
      .merge(labelsUpdate) // Merge enter and update
      .transition()
      .duration(500)
      .attr("x", d => xScale(d.level) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.count) - 5)
      .text(d => d.count > 0 ? d.count : "");
    
    //Old labels removed
    labelsUpdate.exit().remove();
  }

  function highlightCountry(country) {
    currentCountry = country;
    if (currentData) {
      update(currentData);
    }
  }

  function highlightLanguage(langId) {
    if (currentData && langId) {
      const lang = currentData.find(l => l.id === langId);
      if (lang && currentCountry) {
        g.selectAll(".bar")
          .filter(d => d.level === lang.endangerment)
          .transition()
          .duration(100)
          .attr("opacity", 0.4)
          .transition()
          .duration(100)
          .attr("opacity", 0.7)
          .transition()
          .duration(100)
          .attr("opacity", 1);
      }
    }
  }

  return { init, update, highlightCountry, highlightLanguage };
})();