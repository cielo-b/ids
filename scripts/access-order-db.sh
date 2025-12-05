#!/bin/bash
# Access script for Order Database
# Usage: ./scripts/access-order-db.sh

psql -h localhost -p 5440 -U billme_order -d billme_orders

