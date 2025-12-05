#!/bin/bash
# Access script for Receipt Database
# Usage: ./scripts/access-receipt-db.sh

psql -h localhost -p 5442 -U billme_receipt -d billme_receipts

