#!/bin/bash
# Access script for Entity Database
# Usage: ./scripts/access-entity-db.sh

psql -h localhost -p 5435 -U billme_entity -d billme_entities

