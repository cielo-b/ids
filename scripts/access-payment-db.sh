#!/bin/bash
# Access script for Payment Database
# Usage: ./scripts/access-payment-db.sh

psql -h localhost -p 5441 -U billme_payment -d billme_payments

