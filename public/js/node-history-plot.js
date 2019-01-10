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
      .then((exitnodes) => render(exitnodes));
  }

  function render(exitnodes) {
    // debug
    window.exitnodes = exitnodes;
    console.debug(exitnodes);

    // convert all timestamp strings to Date objects
    for (let exitnode of exitnodes) {
      exitnode.timestamps = exitnode.timestamps.map((t) => new Date(t));
    }
    
    let xScale = window.xScale = d3.scaleTime()
      .domain(d3.extent(_.flatten(_.pluck(exitnodes, 'timestamps'))))
      .range([0, plotWidth]);
    let yScale = window.yScale = d3.scaleLinear()
      .domain([0, d3.max(Array.prototype.concat(
        _.flatten(_.pluck(exitnodes, 'gatewayCounts')),
        _.flatten(_.pluck(exitnodes, 'nodeCounts'))
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

    // Associate exitnode IPs with specific colors. It's confusing if every time you load
    // the UI, a different color is used for each exitnode.
    let colors = {
      '64.71.176.94': 'steelblue',
      '45.34.140.42': '#b85bdc',
      '107.170.219.5': '#3eb2f3'
    };
    // Use backup colors for exitnodes we don't know about ahead of time.
    let otherColors = ['#adadad', 'black'];
    exitnodes.forEach((exitnode, idx) => {
      let nodeData = _.zip(exitnode.timestamps, exitnode.nodeCounts).map((el) => {
        return {
          timestamp: el[0],
          value: el[1]
        };
      });

      let gatewayData = _.zip(exitnode.timestamps, exitnode.gatewayCounts).map((el) => {
        return {
          timestamp: el[0],
          value: el[1]
        };
      });

      let exitnodeColor = colors[exitnode.exitnodeIP];
      if (!exitnodeColor)
        exitnodeColor = otherColors[idx % otherColors.length];

      mainGroup.append('path')
        .datum(nodeData)
        .attr('fill', 'none')
        .attr('stroke', exitnodeColor)
        .attr('stroke-width', 1.5)
        .attr('d', line);

      mainGroup.append('text')
        .text(exitnode.exitnodeIP)
        .attr('x', 20 + idx * 130)
        .attr('y', -20)
        .attr('fill', exitnodeColor);

      mainGroup.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', exitnodeColor)
        .attr('x', idx * 130)
        .attr('y', -30);

      // Could render gateways as a dashed line?
      // mainGroup.append('path')
      //   .datum(gatewayData)
      //   .attr('fill', 'none')
      //   .attr('stroke', exitnodeColor)
      //   .attr('stroke-width', 1.5)
      //   .attr('stroke-dasharray', '5, 10, 5')
      //   .attr('d', line);
    });
  }

})();
