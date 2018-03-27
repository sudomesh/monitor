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

Step-by-step guide.

0. install memcached using

```sudo apt-get install memcached``` 

1. install the heroku cli (see https://devcenter.heroku.com/articles/heroku-cli)

2. check whether you installed the heroku cli correctly

Run ```heroku --version``` . Expected results is something like:

```
$ heroku --version
heroku-cli/6.11.17 (linux-x64) node-v7.10.0
```

3. clone this repository

Open a terminal, install git and clone this repository using:

```
cd [your projects directory]
git clone https://github.com/sudomesh/monitor
cd monitor
```

This should create a new directory called ```monitor``` in your projects directory.

4. install node dependencies 

run ```npm install``` to install node dependencies.

5. copy some configuration files

```cp prod.env .env```

6. start memcached

```memcached -v```

7. launch the app locally using foreman

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

