#!/bin/bash

ip route | curl --silent -H "Content-Type: text" -d @- -X POST https://peoplesopen.herokuapp.com/routing-table > /dev/null 
