#!/bin/bash

# exitnodes run this script periodically to publish
# their routing table to the monitor server

DATA=$(ip route | grep via | grep -v default | awk '{print $1 "," $3  }' | sort | uniq | tr '\n' '|')
curl --silent -H 'Content-Type: text/plain' -d $DATA -X POST https://monitor.peoplesopen.net/api/v0/nodes > /dev/null 
