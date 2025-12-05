#!/bin/bash
# Access script for Notification Database
# Usage: ./scripts/access-notification-db.sh

psql -h localhost -p 5443 -U billme_notification -d billme_notifications

