(function() {

  let svg = d3.select('#node-history-plot-svg');
  let svgWidth = svg.node().getBoundingClientRect().width,
      svgHeight = svg.node().getBoundingClientRect().height;

  let plotMargin = 40;
  let plotWidth = svgWidth - 2 * plotMargin,
      plotHeight = svgHeight - 2 * plotMargin;

  init();

  function init() {
    fetch('/api/v0/numNodesTimeseries')
      .then((response) => response.json())
      .then((timeseries) => render(timeseries))
      .catch((error) => console.error(error));
  }

  function render(timeseries) {
    // debug
    window.timeseries = timeseries;
    console.debug(timeseries);

    // convert all timestamp strings to Date objects
    for (let ts of timeseries) {
      ts.timestamps = ts.timestamps.map((t) => new Date(t));
    }
    
    let xScale = window.xScale = d3.scaleTime()
      .domain(d3.extent(_.flatten(_.pluck(timeseries, 'timestamps'))))
      .range([0, plotWidth]);
    let yScale = window.yScale = d3.scaleLinear()
      .domain([0, d3.max(Array.prototype.concat(
        _.flatten(_.pluck(timeseries, 'gatewayCounts')),
        _.flatten(_.pluck(timeseries, 'nodeCounts'))
      ))])
      .range([plotHeight, 0]);
    let mainGroup = svg.append('g')
      .attr('transform', `translate(${plotMargin}, ${plotMargin})`);

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
        .attr('text-anchor', 'middle')
        .text('# nodes');

    // render node counts at each exitnode
    timeseries.forEach((ts, idx) => {
      let nodeData = _.zip(ts.timestamps, ts.nodeCounts).map((el) => {
        return {
          timestamp: el[0],
          value: el[1]
        };
      });

      let gatewayData = _.zip(ts.timestamps, ts.gatewayCounts).map((el) => {
        return {
          timestamp: el[0],
          value: el[1]
        };
      });

      let tsColor = exitnodeUtils.exitnodeColor(ts.label);

      mainGroup.append('path')
        .datum(nodeData)
        .attr('fill', 'none')
        .attr('stroke', tsColor)
        .attr('stroke-width', 1.5)
        .attr('d', line);

      mainGroup.append('text')
        .text(ts.label)
        .attr('x', 20 + idx * 130)
        .attr('y', -20)
        .attr('fill', tsColor);

      mainGroup.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', tsColor)
        .attr('x', idx * 130)
        .attr('y', -30);

      // Could render gateways as a dashed line?
      // mainGroup.append('path')
      //   .datum(gatewayData)
      //   .attr('fill', 'none')
      //   .attr('stroke', timeseriesColor)
      //   .attr('stroke-width', 1.5)
      //   .attr('stroke-dasharray', '5, 10, 5')
      //   .attr('d', line);
    });
  }

})();
