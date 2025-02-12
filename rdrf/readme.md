# for local 

pip install -e .


# prod
pip install -e '.[production]'

## ensure to change the db configs
uncomment

```python
        # DATABASE_USER = DATABASES["default"]["USER"]
# DATABASE_PASSWORD = DATABASES["default"]["PASSWORD"]
# DATABASE_HOST = DATABASES["default"]["HOST"]

```

change the db from 


```shell
python manage.py load_fixture --file=users.json

python manage.py migrate --database=default

python manage.py migrate --database=clinical

python manage.py migrate --database=reporting


```

create cache tables

```
python manage.py createcachetable rdrf_cache rdrf_queries_cache

```


```
python manage.py dbshell

CREATE TABLE rdrf_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(80) NOT NULL,
    code VARCHAR(10) NOT NULL,
    desc TEXT NOT NULL,
    splash_screen TEXT NOT NULL,
    patient_splash_screen TEXT,
    version VARCHAR(20) DEFAULT '',
    metadata_json TEXT DEFAULT ''
);

ALTER TABLE rdrf_registry 
ADD COLUMN patient_data_section_id INTEGER NULL;
ADD COLUMN data TEXT NULL;

```

```
python manage.py migrate
````

CREATE TABLE rdrf_clinicaldata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(80) NOT NULL
)


http://127.0.0.1:8000/admin/fh/questionnaire



### import hospitals 
in django shell
```shell
from registry.patients.import_hospitals import import_hospitals
import_hospitals()
```