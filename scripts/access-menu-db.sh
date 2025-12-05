#!/bin/bash
# Access script for Menu Database
# Usage: ./scripts/access-menu-db.sh

psql -h localhost -p 5439 -U billme_menu -d billme_menus

