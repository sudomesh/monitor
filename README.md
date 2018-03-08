# Peoples Open Network Monitor Page

To help monitor network health. 

Currently, exit node hits a url at https://peoplesopen.herokuapp.com using [monitor.sh](./monitor.sh) script . This relays information about the number of active routes and number of active gateways. If the exit node doesn't check-in for longer than 2 minutes, it is assumed to be down.

Uses memcache/memjs and is supposed to run on heroku.

Leaves much room for improvement ;) 

## Deploy to Heroku

Make sure to enable the memcachier addon. 
```
heroku addons:create memcachier:dev
```

If you you are not familiar with heroku, please see https://heroku.com.

## Running locally 

This assumes some local memcache instance running.

```
npm install
cp prod.env .env
foreman start
```

## Get involved!

We are happy to receive bug reports, fixes, documentation enhancements, and
other improvements.

Please report bugs via the
[github issue tracker](http://github.com/sudomesh/monitor/issues).

