#!/bin/bash
# Access script for User Database
# Usage: ./scripts/access-user-db.sh

psql -h localhost -p 5434 -U billme_user -d billme_users

