(function() {

  let svg = d3.select('#node-history-plot-svg');
  let svgWidth = svg.node().getBoundingClientRect().width,
      svgHeight = svg.node().getBoundingClientRect().height;

  let plotMargin = 40;
  let plotWidth = svgWidth - 2 * plotMargin,
      plotHeight = svgHeight - 2 * plotMargin;

  svg.style('margin-left', `-${plotMargin + 5}px`);

  init();

  function init() {
    // This is the entry point. Get route table from API,
    // convert to list of nodes and links, then render.
    fetch('/api/v0/numNodesTimeseries')
      .then((response) => response.json())
      .then(({ gatewayCounts, nodeCounts, timestamps }) => render(gatewayCounts, nodeCounts, timestamps));
  }

  function render(gatewayCounts, nodeCounts, timestamps) {
    timestamps = timestamps.map((t) => new Date(t));
    
    let xScale = window.xScale = d3.scaleTime()
      .domain(d3.extent(timestamps))
      .range([0, plotWidth]);
    let yScale = window.yScale = d3.scaleLinear()
      .domain([0, d3.max(Array.prototype.concat(gatewayCounts, nodeCounts))])
      .range([plotHeight, 0]);
    let mainGroup = svg.append('g')
      .attr('transform', `translate(${plotMargin}, ${plotMargin})`);

    let nodeData = _.zip(timestamps, nodeCounts).map((el) => {
      return {
        timestamp: el[0],
        value: el[1]
      };
    });

    let gatewayData = _.zip(timestamps, gatewayCounts).map((el) => {
      return {
        timestamp: el[0],
        value: el[1]
      };
    });

    console.log(nodeData, gatewayData);

    let line = d3.line()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.value));

    // x axis
    mainGroup.append('g')
      .attr('transform', `translate(0, ${plotHeight})`)
      .call(d3.axisBottom(xScale));

    // y axis
    mainGroup.append('g')
      .call(d3.axisLeft(yScale).ticks(5, 'd'))
      .append('text')
        .attr('fill', '#000')
        .attr('transform', 'rotate(-90)')
        .attr('y', -26)
        .attr('x', -plotHeight / 2)
        .attr('font-size', '14px')
        // .attr('dy', '0.71em')
        .attr('text-anchor', 'middle')
        .text('# nodes');

    mainGroup.append('path')
      .datum(nodeData)
      .attr('class', 'node-blue')
      .attr('fill', 'none')
      // .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .attr('d', line);

    mainGroup.append('path')
      .datum(gatewayData)
      .attr('class', 'gateway-purple')
      .attr('fill', 'none')
      // .attr('stroke', '#b85bdc')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  }

})();
