// Helper functions used in multiple widgets

(function() {
  let exitnodes = {
    // Associate exitnode IPs with specific colors. It's confusing if every time you load
    // the UI, a different color is used for each exitnode.
    '64.71.176.94': {
      color: '#F2813F',
      label: 'hurricane-electric'
    },
    '45.34.140.42': {
      color: '#b85bdc',
      label: 'psychz'
    },
    '107.170.219.5': {
      color: '#3eb2f3',
      label: 'digital-ocean'
    },
    '208.70.31.83': {
      color: '#7FDB5A',
      label: 'internet-archive'
    }
  };

  window.exitnodeUtils = {
    exitnodes: exitnodes,
    exitnodeColor: (exitnodeIP) => {
      // Use backup color for exitnodes we don't know about ahead of time.
      let otherColor = 'black';
      if (exitnodeIP in exitnodes) {
        return exitnodes[exitnodeIP].color;
      } else {
        return otherColor;
      }
    },
    exitnodeLabel: (exitnodeIP) => {
      if (exitnodeIP in exitnodes) {
        return exitnodes[exitnodeIP].label;
      } else {
        return '';
      }
    }
  };
})();
