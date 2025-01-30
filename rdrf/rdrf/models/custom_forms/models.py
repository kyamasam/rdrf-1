from rdrf.models.definition.models import Registry
from registry.patients.models import Patient
from django.db import models


class CustomFormData(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    data = models.JSONField()
    form_code =  models.CharField(max_length=255)
    registry = models.ForeignKey(Registry, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def meta(self):
        # only one record can exist for a patient per registry and form
        unique_together = [
            "registry","patient", "form_code"
        ]