#!/bin/bash
# Access script for Report Database
# Usage: ./scripts/access-report-db.sh

psql -h localhost -p 5445 -U billme_report -d billme_reports

