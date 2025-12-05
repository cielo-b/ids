#!/bin/bash
# Access script for Manager Database
# Usage: ./scripts/access-manager-db.sh

psql -h localhost -p 5437 -U billme_manager -d billme_managers

