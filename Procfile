release: python backend/manage.py migrate --noinput
web: gunicorn core.wsgi:application --chdir backend --log-file -
