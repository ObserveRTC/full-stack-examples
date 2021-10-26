
Observer + Kafka + Node-RED
===

Setup an observer, which sends the generated reports to kafka.

### Usage

1. Run `docker-compose up`

2. Go to http://localhost:1880 (the Node-RED dashboard)
 * Install observertc and kafka client (Settings -> Palette -> Install)
 * Setup Kafka Consumer to consume from kafka (`docker_demo_2_kafka:29092`) and from the topic the observer sends the reports (`ortc_demo_2_reports`)
 * Wire a function node to the kafka-consumer and destructure the kafka messages as follows: `return { payload: msg?.payload?.value };`
 * Add report-demuxer and wire it to the function you just created. 

3. report-demuxer has all the report outputs you need. TO know which report type contains what see https://github.com/ObserveRTC/schemas-2.0/tree/main/generated-schemas/reports/v3 


NOTE: It may happens that the kafka has not been initialized fully before the observer starts running and therefore the sink connection does not succeed. In those occasion retry or increase the initial waiting time for the observer 
through an environment variable `INITIAL_WAITING_TIME_IN_S` you find it in the `docker-compose.yaml`


### Configurations

Observer configuration files (`observer-config.yaml`) setup a sink to the kafka.


### Additional notes:

 * if you want to customize any Kafka parameters, simply add them as environment variables in ```docker-compose.yml```.
 * Kafka's log4j usage can be customized by adding environment variables prefixed with ```LOG4J_```.
