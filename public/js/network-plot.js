(function() {
  let canvas = document.getElementById('network-plot'),
      ctx = canvas.getContext('2d');

  init();

  function init() {
    // This is the entry point. Get route table from API,
    // convert to list of nodes and links, then render.
    
    // If there's no canvas, don't do anything.
    if (!canvas)
      return;

    fetch('/api/v0/nodes')
      .then((response) => response.json())
      .then((routeTables) => routesToLinksAndNodes(routeTables))
      .then(({ links, nodes }) => render(links, nodes));
  }

  function render(links, nodes) {
    let simulation = d3.forceSimulation();
    simulation.nodes(nodes);
    simulation
      .force('link', d3.forceLink(links).id((d) => d.ip))
      .force('charge', d3.forceManyBody().distanceMax(150));

    simulation.on('tick', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      links.forEach((link) => {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = '#aaa';
        ctx.stroke();
      });

      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
        ctx.fill();

        if (node.type === 'exitnode') {
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(node.ip, node.x, canvas.height - 10);
        }
      });
    });
  }

  function routesToLinksAndNodes(routeTables) {
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
          source: table.exitNodeIP,
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
    let exitnodeIPs = routeTables.map((table) => table.exitNodeIP);
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
        fx: (idx + 1) * canvas.width / (exitnodeIPs.length + 1),
        fy: canvas.height / 2,
        type: 'exitnode'
      };
    });

    // All nodes == exitnodes + homenodes
    let nodes = Array.prototype.concat(exitnodes, homenodes);

    return { links, nodes };
  }
})();
