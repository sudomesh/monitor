# Peoples Open Network Monitor Page

[![Build Status](https://travis-ci.org/sudomesh/monitor.svg?branch=master)](https://travis-ci.org/sudomesh/monitor)

To help monitor network health. 

Exit nodes periodically execute [monitor.sh](./monitor.sh) and [post-routing-table.sh](./post-routing-table.sh), hitting two API endpoints at https://peoplesopen.herokuapp.com/api/v0/. This relays information about the number of active routes, active gateways, and the full contents of the exit node's routing table. If an exit node hasn't checked in in more than 2 minutes, it is assumed to be down.

Uses memcache/memjs, and mongo db. Deployed to heroku.

Leaves much room for improvement ;)

## Running locally 

Step-by-step guide.

#### 0. install deps

```
sudo apt-get install memcached mongodb
``` 

#### 1. clone this repository

Open a terminal, install git and clone this repository using:

```
cd [your projects directory]
git clone https://github.com/sudomesh/monitor
cd monitor
```

This should create a new directory called   `monitor` in your projects directory.

#### 2. install node dependencies 

```
npm install
```

#### 3. copy some configuration files

```
cp dev.env .env
```

#### 4. start memcached

```
memcached -v
```

#### 5. start mongodb

Create a folder in `monitor` called `data` where mongo writes all of its database files, then start up the mongodb server:

```
mkdir data
mongod --dbpath=data
```

#### 6. setup mongodb

```
node setup-db.py
```

#### 7. launch the app

```
npm start
```

Check whether your app launched properly by going to http://localhost:3000 in your favorite browser.

#### 8. simulate exitnodes phoning home

By default, you should see a notification that all exit nodes are down. To simulate exit nodes phoning home about their routing tables, open a commandline in the monitor directory and execute:

```
node tools/simulate-activity.js
```

This script sets a key-value pair on memcache in such a way that the monitor page gets all like "hey, this exit node is alive!"

After running this, reload your local monitor page and the page should indicate that the exit monitor is up. After 2 minutes, this is no longer the case, because the activity metrics expire.

#### how to wipe mongodb

If you ever need to wipe your mongo database of simulated activity, kill `mongod` with `ctrl+c`, make a fresh data directory, then restart `mongod`:

```
rm -r data
mkdir data
mongod --dbpath=data
```

## Running tests

To run tests, first install jasmine using ```npm install jasmine -g```. Then, you can run the tests using ```npm test```.

## Deployment
PRs (and additional commits against them) will always trigger a Travis build.
Successful Travis builds will spin up a dev deployment on Heroku automatically if the branch is in the repo,
and dev deployments can be triggered manually by maintainers if the PR is from a fork.

Merges into master and commits directly against master will both trigger Travis builds.
Successful builds are then deployed to
[production](https://peoplesopen.herokuapp.com).

As PRs from forks do not automatically deploy review applications,
new contributors may wish to deploy their own Heroku instances.
You won't be able to see your logs,
but dev (free) application is otherwise sufficient for this purpose.

### Setting up your own Heroku instance

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


## Get involved!

We are happy to receive bug reports, fixes, documentation enhancements, and
other improvements.

Please report bugs via the
[github issue tracker](http://github.com/sudomesh/monitor/issues).

