#!/bin/bash
# Access script for Employee Database
# Usage: ./scripts/access-employee-db.sh

psql -h localhost -p 5438 -U billme_employee -d billme_employees

