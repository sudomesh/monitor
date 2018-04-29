#!/bin/bash

ip route | grep via | grep -v default | awk '{print $1 "," $3  }' | sort | uniq | tr '\n' '|' | curl --silent -H 'text/plain' --data @- -X POST https://peoplesopen.herokuapp.com/routing-table > /dev/null 
