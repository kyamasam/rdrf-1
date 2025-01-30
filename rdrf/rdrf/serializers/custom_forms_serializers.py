from rdrf.models.custom_forms.models import CustomFormData
from rdrf.models.definition.models import Registry, Section
from registry.patients.models import Patient
from rest_framework import serializers

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'

class RegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Registry
        fields = '__all__'


class CustomFormDataSerializer(serializers.ModelSerializer):
    patient_id= serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    patient = PatientSerializer(read_only=True)
    registry_id= serializers.PrimaryKeyRelatedField(queryset=Registry.objects.all(), write_only=True)
    registry = RegistrySerializer(read_only=True)
    
    def validate_form_code(self, data):
        section_codes = Section.objects.all().values_list('code', flat=True)
        if data not in section_codes:
            raise serializers.ValidationError("Invalid form code")
        return data
    class Meta:
        model = CustomFormData
        fields = [
            'id',
            'patient',
            'patient_id',
            'data',
            'form_code',
            'registry',
            'registry_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']