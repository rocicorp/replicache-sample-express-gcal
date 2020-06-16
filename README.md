# About

This repository implements a sample backend integration of Replicache
on top of the Google Calendar API.

It is a Node.js server, built with Express and PostgresSQL that runs
on Heroku.

It's running live at https://replicache-sample-gcal.herokuapp.com/.

# Develop

1. Get the code
2. `npm install`
3. Install the [Heroku development environment](https://devcenter.heroku.com/articles/heroku-local).
4. [Install Postgres locally](https://devcenter.heroku.com/articles/heroku-postgresql#local-setup)
  * **Note**: At least for me, the `DATABASE_URL` needed to be `postgresql://localhost`, not `postgres://localhost`
5. `npm run build-ts && heroku local web`

# Production

Just push to Github, it's automatically pushed to Heroku.

# Integrity

The Google Calendar API lacks sufficient power to capture all the
benefits of Replicache. Specifically, there's no concurrency controls
for mutations.

Other Google APIs have this feature, but Calendar doesn't. As
a result, it is possible in edge cases for Replicache mutations to
get applied out of order, and so Replicache cannot guarantee
causal consistency.
