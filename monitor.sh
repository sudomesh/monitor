#!/bin/sh

ROUTES=$(ip route | grep via | grep -v default | awk '{print $1 "\t" $3  }' | sort | uniq | wc -l)
GATEWAYS=$(ip route | grep via | grep -v default | awk '{print $3 }' | sort | uniq | wc -l)

curl --silent "https://peoplesopen.herokuapp.com/?numberOfRoutes=${ROUTES}&numberOfGateways=${GATEWAYS}" > /dev/null
