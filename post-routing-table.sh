#!/bin/bash

DATA=$(ip route | grep via | grep -v default | awk '{print $1 "," $3  }' | sort | uniq | tr '\n' '|')
curl --silent -H 'Content-Type: text/plain' -d $DATA -X POST https://peoplesopen.herokuapp.com/api/v0/nodes > /dev/null 
