
Observer + Kafka
===

Setup an observer, which sends the generated reports to kafka.

### Usage

```shell
    docker-compose up 
```

### Configurations

Observer configuration files (`observer-config.yaml`) setup a sink to the kafka.


### Additional notes:

 * if you want to customize any Kafka parameters, simply add them as environment variables in ```docker-compose.yml```.
 * Kafka's log4j usage can be customized by adding environment variables prefixed with ```LOG4J_```.
