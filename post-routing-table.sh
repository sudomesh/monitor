#!/bin/bash

ip route | curl -H "Content-Type: text" -d @- -X POST https://peoplesopen.herokuapp.com/routing-table
