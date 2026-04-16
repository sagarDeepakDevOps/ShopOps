# Monitoring Stack

Monitoring assets are organized by subsystem:

- `prometheus/`: scrape configuration and rules
- `grafana/`: provisioned datasources and dashboards
- `jaeger/`: tracing notes and runtime conventions
- `elk/logstash/`: log ingestion pipeline configuration

These folders are mounted by root `docker-compose.yml` and can be deployed independently in container orchestration environments.
