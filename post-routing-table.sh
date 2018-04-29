#!/bin/bash

ip route | grep via | grep -v default | awk '{print $1 "\t" $3  }' | sort | uniq | tr '\n' '|' | curl -H 'text/plain' --data @- -X POST https://peoplesopen.herokuapp.com/routing-table  
