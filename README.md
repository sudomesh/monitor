# Peoples Open Network Monitor Page

To help monitor network health. 

[![Build Status](https://travis-ci.org/sudomesh/monitor.svg?branch=master)](https://travis-ci.org/sudomesh/monitor)

Currently, exit node hits a url at https://peoplesopen.herokuapp.com using [monitor.sh](./monitor.sh) script . This relays information about the number of active routes and number of active gateways. If the exit node doesn't check-in for longer than 2 minutes, it is assumed to be down.

Uses memcache/memjs and is supposed to run on heroku.

Leaves much room for improvement ;) 

## Running tests

To run tests, first install jasmine using ```npm install jasmine -g```. Then, you can run the tests using ```npm test```.

## Deploy to Heroku

Make sure to enable the memcachier addon. 
```
heroku addons:create memcachier:dev
```

If you you are not familiar with heroku, please see https://heroku.com.

To install the heroku cli, see https://devcenter.heroku.com/articles/heroku-cli. To check whether you installed the heroku cli correctly, run `heroku --version`. Expected results is something like:

```
$ heroku --version
heroku-cli/6.11.17 (linux-x64) node-v7.10.0
```

To push to current production server, get access push access and add the following to .git/config:

```
[remote "heroku"]
url = https://git.heroku.com/peoplesopen.git
fetch = +refs/heads/*:refs/remotes/heroku/*
```

## Running locally 

Step-by-step guide.

0. install memcached using

```sudo apt-get install memcached``` 

1. install foreman using ```gem install foreman``` (also see https://github.com/ddollar/foreman).

2. clone this repository

Open a terminal, install git and clone this repository using:

```
cd [your projects directory]
git clone https://github.com/sudomesh/monitor
cd monitor
```

This should create a new directory called ```monitor``` in your projects directory.

3. install node dependencies 

run ```npm install``` to install node dependencies.

4. copy some configuration files

```cp dev.env .env```

5. start memcached

```memcached -v```

6. launch the app locally using foreman

Foreman is an app that ships with the heroku cli and is used to simulate the start of a heroku dyno. Essentially, it is a startup script.

```foreman start```

Check whether your app launch properly by going to https://localhost:3000 in your favorite browser.

By default, you should see a notification that the exit node is down. To simulate exit node activity, open a commandline in the monitor directory and execute ```nodejs ./simulate-activity.js```. This script sets a key-value pair on memcache in such a way that the monitor page gets all like "hey, this exit node is alive!"

After running this, reload your local monitor page and the page should indicate that the exit monitor is up. After 2 minutes, this is no longer the case, because the activity metrics expire.


For more information, see https://devcenter.heroku.com/articles/memcachier#local-usage .


## Get involved!

We are happy to receive bug reports, fixes, documentation enhancements, and
other improvements.

Please report bugs via the
[github issue tracker](http://github.com/sudomesh/monitor/issues).

