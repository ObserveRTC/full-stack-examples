
Observer + Mongo
===

Setup an observer, which sends the generated reports to MongoDB.

### Usage

```shell
    docker-compose up 
```

Go to http://localhost:8081 mongo express, enter with the username and password (root/password) and there you will find the reports under the database you setup to save them (`ortc_reports`).

### Configurations

Observer configuration files (`observer-config.yaml`) setup a sink to mongo.
