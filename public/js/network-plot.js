(function() {
  let svg = d3.select('#network-plot-svg');
  let svgWidth = svg.node().getBoundingClientRect().width,
      svgHeight = svg.node().getBoundingClientRect().height;
  let htmlContainer = d3.select('#network-plot-html');
  
  init();

  function init() {
    // This is the entry point. Get route table from API,
    // convert to list of nodes and links, then render.
    fetch('/api/v0/nodes')
      .then((response) => response.json())
      .then((routeTables) => routesToLinksAndNodes(routeTables))
      .then(({ links, nodes }) => render(links, nodes))
      .catch((error) => console.error(error));
  }

  function render(links, nodes) {
    let simulation = d3.forceSimulation();
    simulation.nodes(nodes);
    simulation
      .force('link', d3.forceLink(links).id((d) => d.ip))
      .force('charge', d3.forceManyBody().distanceMax(150));
    
    //
    // Hover tooltip
    //

    // Note: using HTML instead of SVG for the tooltip because
    // styling text is easier.
    let tooltipGroup = htmlContainer.append('div')
      .attr('class', 'tooltip-group')
      .style('position', 'absolute')
      .style('top', '0px')
      .style('display', 'none');
    
    let tooltipText = tooltipGroup.append('div')
      .attr('class', 'tooltip-text')
      .style('margin-left', '15px')
      .style('padding', '5px 7px')
      .style('border', '1px solid')
      .style('background', 'rgba(255, 255, 255, 0.8)')
      .style('font-family', 'monospace')
      .style('transform', 'translate(0px, -50%)');

    let showTooltip = (node) => {
      tooltipText.text(node.ip);
      tooltipGroup
        .style('transform', `translate(${node.x}px, ${node.y}px)`)
        .style('display', 'block');
    };

    let hideTooltip = () => {
      tooltipGroup.style('display', 'none');
    };

    //
    // Exit node labels
    //

    let exitnodeLabelGroup = htmlContainer.append('div')
      .attr('class', 'exitnode-label-container')
      .style('position', 'absolute')
      .style('top', '0px');

    let exitnodeLabel = exitnodeLabelGroup.selectAll('.exitnode-label')
      .data(nodes.filter((n) => n.type === 'exitnode'))
      .enter()
      .append('div')
      .attr('class', 'exitnode-label')
      .style('font-family', 'monospace')
      .style('color', (node) => exitnodeUtils.exitnodeColor(node.ip))
      .style('position', 'absolute')
      .style('top', `${svgHeight}px`)
      .style('text-align', 'center')
      .style('white-space', 'nowrap')
      .style('transform', 'translate(-50%, -100%)');
      
    exitnodeLabel
      .append('div')
      .text((node) => node.ip);

    exitnodeLabel
      .append('div')
      .text((node) => exitnodeUtils.exitnodeLabel(node.ip));
    
    //
    // Render links
    //

    let linkGroup = svg.append('g').attr('class', 'links');
    let linkEls = linkGroup.selectAll('.link').data(links);
    let newLinkEls = linkEls
      .enter().append('line')
        .attr('class', 'link')
        .attr('stroke-width', 1)
        .attr('stroke', 'steelblue');

    //
    // Render nodes
    //

    let nodeGroup = svg.append('g').attr('class', 'nodes');
    let nodeEls = nodeGroup.selectAll('.node-container').data(nodes);
    let newNodeEls = nodeEls
      .enter()
      .append('g')
        .attr('class', 'node-container')

    newNodeEls.append('circle')
      .attr('class', 'hover-target')
      .attr('r', '15')
      .attr('fill', 'white')
      .attr('visibility', 'hidden')
      .attr('pointer-events', 'all');

    newNodeEls.append('circle')
      .attr('class', 'outer-circle')
      .attr('r', 8)
      .attr('fill', 'white');

    newNodeEls.append('circle')
      .attr('class', 'inner-circle')
      .attr('r', 5)
      .attr('fill', (node) => {
        if (node.type === 'exitnode')
          return exitnodeUtils.exitnodeColor(node.ip);
        else
          return 'black';
      });

    newNodeEls.on('mouseover', function(node) {
      d3.select(this).select('.outer-circle')
        .attr('stroke', 'black');
      showTooltip(node);
    });

    newNodeEls.on('mouseout', function(node) {
      d3.select(this).select('.outer-circle')
        .attr('stroke', 'none');
      hideTooltip();
    });


    //
    // Update svg element positions
    //

    simulation.on('tick', () => {
      let linkEls = linkGroup.selectAll('.link').data(links);
      linkEls
        .attr('x1', (link) => link.source.x)
        .attr('y1', (link) => link.source.y)
        .attr('x2', (link) => link.target.x)
        .attr('y2', (link) => link.target.y);
      
      let nodeEls = nodeGroup.selectAll('.node-container').data(nodes);
      nodeEls.attr('transform', (node) => `translate(${node.x} ${node.y})`);

      exitnodeLabelGroup.selectAll('.exitnode-label')
        .data(nodes.filter((node) => node.type === 'exitnode'))
        .style('left', (node) => `${node.x}px`);
    });
  }

  function routesToLinksAndNodes(routeTables) {
    // for debugging
    window.routeTables = routeTables;
    
    // Filter out routes that we haven't seen in the last X minutes
    let now = new Date();
    for (let table of routeTables) {
      if (table.error) {
        continue;
      }
      table.routingTable = table.routingTable.filter((route) => {
        return (now - new Date(route.timestamp)) < 1000 * 60 * 3;
      });
    }

    // First, the links between exitnodes and gateways
    let exitnodeLinks = [];
    for (let table of routeTables) {
      if (table.error) {
        continue;
      }
      let gatewayIPs = table.routingTable.map((route) => route.gatewayIP);
      let uniqueGatewaysIPs = Array.from(new Set(gatewayIPs));
      let gatewayLinks = uniqueGatewaysIPs.map((gatewayIP) => {
        return {
          source: table.exitnodeIP,
          target: gatewayIP
        };
      })
      exitnodeLinks = exitnodeLinks.concat(gatewayLinks);
    }

    // Then, the links between home nodes.
    // Currently in our routing tables, we expect to see only addresses
    // with /26 subnet masks, or no mask at all.
    // This viz assumes that the /26 addresses correspond to home nodes, and that those
    // home nodes are assigned a mesh ip corresponding to the first address in their subnet.
    // I.e. 100.43.26.0/26 gets converted to 100.43.26.1.
    let firstSubnetAddress = (subnetAddress) => {
      let ipParts = subnetAddress.slice(0, -3).split('.');
      ipParts[3] = parseInt(ipParts[3]) + 1;
      return ipParts.join('.');
    };

    let simplifySubnetAddress = (subnetAddress) => {
      if (subnetAddress.endsWith('/26')) {
        return firstSubnetAddress(subnetAddress);
      } else if (subnetAddress.includes('/')) {
        console.warn(`Skipping a route to a weird subnet: ${subnetAddress}`);
        return null;
      } else {
        return subnetAddress;
      }
    };

    let allRoutes = routeTables
      .filter((table) => !table.error)
      .reduce((acc, table) => acc.concat(table.routingTable), []);

    let homenodeLinks = allRoutes.map((r) => {
      return {
        source: r.gatewayIP,
        target: simplifySubnetAddress(r.nodeIP)
      }
    }).filter((r) => (r.target !== null && r.source !== r.target));

    // All links == (exitnode -> gateway) + (gateway -> everything else)
    let links = Array.prototype.concat(exitnodeLinks, homenodeLinks);

    // Now the nodes themselves, one per unique ip address
    let exitnodeIPs = routeTables.map((table) => table.exitnodeIP);
    let homenodeIPs = links.map((r) => r.target);
    // remove dupes
    homenodeIPs = Array.from(new Set(homenodeIPs));

    // Wrap ip strings in objects with extra info for rendering
    let homenodes = homenodeIPs.map((ip) => {
      return {
        ip: ip,
        type: 'homenode'
      };
    });

    let exitnodes = exitnodeIPs.map((ip, idx) => {
      return {
        ip: ip,
        // init the x position of exitnodes so they end up spaced out horizontally
        fx: (idx + 1) * svgWidth / (exitnodeIPs.length + 1),
        fy: svgHeight / 2,
        type: 'exitnode'
      };
    });

    // All nodes == exitnodes + homenodes
    let nodes = Array.prototype.concat(exitnodes, homenodes);

    return { links, nodes };
  }
})();
