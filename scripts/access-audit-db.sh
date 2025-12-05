#!/bin/bash
# Access script for Audit Database
# Usage: ./scripts/access-audit-db.sh

psql -h localhost -p 5444 -U billme_audit -d billme_audit

