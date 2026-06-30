release: python backend/manage.py migrate --noinput && python backend/manage.py seed_demo
web: gunicorn core.wsgi:application --chdir backend --log-file -
