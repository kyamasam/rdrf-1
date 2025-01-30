#!/bin/bash
set -e

# wait for database to start...
sleep 2

# Run migrations
cd /app/rdrf
python manage.py migrate

# Start development server
exec python manage.py runserver 0.0.0.0:8000