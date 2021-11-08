
Observer + Kafka
===

Setup an observer, which sends the generated reports to kafka.

### Usage

```shell
    docker-compose up 
```

NOTE: It may happens that the kafka has not been initialized fully before the observer starts running and therefore the sink connection does not succeed. In those occasion retry or increase the initial waiting time for the observer 
through an environment variable `INITIAL_WAITING_TIME_IN_S` you find it in the `docker-compose.yaml`


### Configurations

Observer configuration files (`observer-config/config.yaml`) setup a sink to the kafka.


### Additional notes:

 * if you want to customize any Kafka parameters, simply add them as environment variables in ```docker-compose.yml```.
 * Kafka's log4j usage can be customized by adding environment variables prefixed with ```LOG4J_```.
