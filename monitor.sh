#!/bin/sh

# Exitnodes run this script periodically to publish
# statistics about connected nodes to the monitor server.

# NOTE: This was useful before we started using the
# post-routing-table.sh script. It's probably redundant now.

ROUTES=$(ip route | grep via | grep -v default | awk '{print $1 "\t" $3  }' | sort | uniq | wc -l)
GATEWAYS=$(ip route | grep via | grep -v default | awk '{print $3 }' | sort | uniq | wc -l)

URL="https://peoplesopen.herokuapp.com/api/v0/monitor"

curl -H "Content-Type: application/json" -X POST -d "{ \"numberOfRoutes\": $ROUTES, \"numberOfGateways\": $GATEWAYS }" $URL > /dev/null
