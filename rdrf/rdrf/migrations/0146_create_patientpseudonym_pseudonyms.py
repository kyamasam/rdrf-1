from django.db import migrations
from django.conf import settings

def forwards_func(apps, schema_editor):
    # Only run if we're targeting pseudonyms database
    if schema_editor.connection.alias == 'pseudonyms':
        # Create the table explicitly
        schema_editor.execute("""
            CREATE TABLE IF NOT EXISTS rdrf_patientpseudonym (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pseudonym VARCHAR(255) NULL,
                original_patient_record INTEGER NULL
            )
        """)

def reverse_func(apps, schema_editor):
    if schema_editor.connection.alias == 'pseudonyms':
        schema_editor.execute("DROP TABLE IF EXISTS rdrf_patientpseudonym")

class Migration(migrations.Migration):

    dependencies = [
        ('rdrf', '0145_auto_20220914_1523'),
    ]

    operations = [
        migrations.RunPython(forwards_func, reverse_func),
    ]