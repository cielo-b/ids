#!/bin/bash
# Access script for Auth Database
# Usage: ./scripts/access-auth-db.sh

psql -h localhost -p 5433 -U billme_auth -d billme_auth

