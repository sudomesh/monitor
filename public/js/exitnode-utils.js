// Helper functions used in multiple widgets

let exitnodeUtils = {
  exitnodeColor: (exitnodeIP) => {
    // Associate exitnode IPs with specific colors. It's confusing if every time you load
    // the UI, a different color is used for each exitnode.
    let colors = {
      '64.71.176.94': '#F2813F',
      '45.34.140.42': '#b85bdc',
      '107.170.219.5': '#3eb2f3',
      '208.70.31.83': '#7FDB5A'
    };
    // Use backup color for exitnodes we don't know about ahead of time.
    let otherColor = 'black';

    let exitnodeColor = colors[exitnodeIP];
    if (!exitnodeColor)
      exitnodeColor = otherColor;
    return exitnodeColor;
  }
};
