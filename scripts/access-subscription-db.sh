#!/bin/bash
# Access script for Subscription Database
# Usage: ./scripts/access-subscription-db.sh

psql -h localhost -p 5436 -U billme_subscription -d billme_subscriptions

