#!/bin/sh

ROUTES=$(ip route | grep via | grep -v default | awk '{print $1 "\t" $3  }' | sort | uniq | wc -l)
GATEWAYS=$(ip route | grep via | grep -v default | awk '{print $3 }' | sort | uniq | wc -l)

URL="https://peoplesopen.herokuapp.com"

curl -H "Content-Type: application/json" -X POST -d "{ \"numberOfRoutes\": $ROUTES, \"numberOfGateways\": $GATEWAYS }" $URL > /dev/null
