from os import error
from rdrf.models.custom_forms.models import CustomFormData
from rdrf.serializers.custom_forms_serializers import CustomFormDataSerializer
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
class PostCustomFormDataViewSet(viewsets.ViewSet):
    '''
    used to save the formdata from custom forms
    '''
    serializer_class = CustomFormDataSerializer
    queryset = CustomFormData.objects.all()
    authentication_classes = []
    permission_classes = []


    def create(self, request):
        """ this method creates or updates the custom formdata"""
        serializer =  CustomFormDataSerializer(data= request.data)
        if serializer.is_valid():
            # save data
            patient =  serializer.validated_data.pop('patient_id')
            registry = serializer.validated_data.pop('registry_id')
            form_code = serializer.validated_data.get('form_code')
            visit_number = serializer.data.get('visit_number')
            print("*****", visit_number)
            existing_data = CustomFormData.objects.filter(
                patient=patient,
                registry=registry,
                visit_number=visit_number,
                form_code=form_code
            ).first()
            if existing_data is None:
                data = CustomFormData.objects.create(patient=patient,registry=registry, **serializer.validated_data)
            else:
                # only update the data attr
                existing_data.data=serializer.validated_data.get('data')
                existing_data.save()
                data = existing_data
            return Response(CustomFormDataSerializer(data).data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, pk=None):
        try:
            data  = CustomFormData.objects.get(pk=pk)
            return Response(CustomFormDataSerializer(data).data, status=status.HTTP_200_OK)
        except CustomFormData.DoesNotExist:
            return Response(data = "Could not find custom form data ",status=status.HTTP_404_NOT_FOUND)

    def update(self, request, pk=None):
        try:
            data = CustomFormData.objects.get(pk=pk)
        except CustomFormData.DoesNotExist:
            return Response(data = "Could not find custom form data ",status=status.HTTP_404_NOT_FOUND)
        serializer = CustomFormDataSerializer(data=request.data)
        if serializer.is_valid():
            data.data=serializer.validated_data.get('data')
            data.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="get-custom-form-data")
    def get_custom_form_data(self, request):
        """
        get custom form data for a patient
        pass the following params 
        patient_id: int
        registry_id: int
        visit_number: int
        all_visits: boolean
        form_code: str
        """
        # params
        params = request.query_params
        patient_id = params.get('patient_id')
        visit_number = params.get('visit_number', None)
        registry_id = params.get('registry_id')
        form_code = params.get('form_code')
        all_visits = params.get('all_visits',None)

        if all_visits is not None:
            all_visits = True if all_visits.lower() == 'true' else False
        else:
            all_visits = False
        # Add validation for required parameters
        if not all([patient_id, registry_id, form_code]):
            return Response(
                {"error": "Missing required parameters. Please provide patient_id, registry_id, and form_code"},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = CustomFormData.objects.filter(
                patient_id=patient_id,
                registry_id=registry_id,
                form_code=form_code,
            )
        if visit_number:
            data = data.filter(visit_number=visit_number)


        if not all_visits:
            data = data.latest('updated_at')
        else:
            return Response(CustomFormDataSerializer(data, many=True).data, status=status.HTTP_200_OK)
            
        if data is None:
            return Response({"error" : "Could not find custom form data "},status=status.HTTP_404_NOT_FOUND)
        return Response(CustomFormDataSerializer(data).data, status=status.HTTP_200_OK)