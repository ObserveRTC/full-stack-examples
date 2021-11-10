
Observer + MyApp
===

Setup an observer sends reports to a [socket-io](socket.io) sink.
a custom NodeJS service, [myApp](myApp/) receives reports from the observer 
and calculate the number of calls started, ended and durations to a prometheus 
`/metrics` endpoint at myApp.

### Usage

```shell
    docker-compose up 
```


### Configurations

Observer configuration files (`observer-config/config.yaml`) setup a sink to the kafka.
