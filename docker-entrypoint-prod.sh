#!/bin/bash
set -e

# wait for database to start...
sleep 2

# Run migrations
python manage.py migrate

# Start uwsgi
exec uwsgi --ini /app/rdrf/uwsgi.ini