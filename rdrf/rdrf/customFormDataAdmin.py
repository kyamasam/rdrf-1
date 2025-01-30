from django.contrib import admin
from django.http import HttpResponse
import csv
from django.utils.html import format_html
import json
from django.contrib.admin.views.main import ChangeList
from rdrf.models.custom_forms.models import CustomFormData

class CustomFormDataAdmin(admin.ModelAdmin):
    model = CustomFormData
    list_filter = ("patient", "registry")
    actions = ['export_to_csv']
    def export_to_csv(self, request, queryset):
        # Create the HttpResponse object with CSV header
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="custom_form_data.csv"'
        
        writer = csv.writer(response)
        
        # Get all unique keys from all records' data
        all_keys = set()
        for record in queryset:
            if record.data:
                all_keys.update(record.data.keys())
        
        # Convert keys to readable headers
        headers = ['Patient', 'Registry'] + [
            ''.join(' ' + char if char.isupper() else char for char in key).strip().title() 
            for key in all_keys
        ]
        
        # Write headers
        writer.writerow(headers)
        
        # Write data rows
        for record in queryset:
            row = [str(record.patient), str(record.registry)]
            
            # Add data fields
            for key in all_keys:
                value = record.data.get(key, '') if record.data else ''
                if isinstance(value, (dict, list)):
                    value = json.dumps(value)
                row.append(str(value))
                
            writer.writerow(row)
        
        return response
        
    export_to_csv.short_description = "Export selected records to CSV"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        form_code = request.GET.get('form_code')
        if form_code:
            qs = qs.filter(form_code=form_code)
        return qs

    def get_list_display(self, request):
        base_fields = ["patient", "registry"]
        try:
            # Get the filtered queryset
            qs = self.get_queryset(request)
            if not qs.exists():
                return base_fields
                
            # Get first record of filtered queryset
            first_record = qs.first()
            if first_record and first_record.data:
                return base_fields + [f"data_{key}" for key in first_record.data.keys()]
        except:
            pass
        return base_fields

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._dynamic_methods = {}

    def setup_dynamic_methods(self, request):
        """Setup dynamic methods based on filtered queryset"""
        try:
            qs = self.get_queryset(request)
            if not qs.exists():
                return
                
            first_record = qs.first()
            if first_record and first_record.data:
                for key in first_record.data.keys():
                    method_name = f'data_{key}'
                    if method_name not in self._dynamic_methods:
                        self._dynamic_methods[method_name] = self.get_dynamic_data_method(key)
        except:
            pass

    def changelist_view(self, request, extra_context=None):
        # Setup dynamic methods before rendering the changelist
        self.setup_dynamic_methods(request)
        
        # Add form code to the page title if it exists
        extra_context = extra_context or {}
        form_code = request.GET.get('form_code')
        if form_code:
            # Convert camelCase to Title Case
            title = ''.join(' ' + char if char.isupper() else char for char in form_code).strip().title()
            self.verbose_name_plural = f"{title} Forms"
            extra_context['title'] = title  # Add title to context
            extra_context['subtitle'] = 'Custom Form Data'  # Optional subtitle
        return super().changelist_view(request, extra_context=extra_context)

    def get_dynamic_data_method(self, key):
        def dynamic_data(obj):
            if obj.data and key in obj.data:
                value = obj.data[key]
                if isinstance(value, (dict, list)):
                    return format_html('<pre style="margin: 0; white-space: pre-wrap;">{}</pre>', 
                                     json.dumps(value, indent=2))
                return str(value) if value is not None else ''
            return ''
            
        # Convert camelCase to Title Case With Spaces
        display_name = ''.join(' ' + char if char.isupper() else char for char in key).strip()
        display_name = display_name.title()
        
        dynamic_data.short_description = display_name
        return dynamic_data

    def __getattr__(self, name):
        if name.startswith('data_') and name in self._dynamic_methods:
            return self._dynamic_methods[name]
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    class Media:
        css = {
            'all': ('admin/css/custom_form_data.css',)
        }

    def get_changelist(self, request, **kwargs):
        """Return a custom ChangeList class that includes the form title"""
        return CustomFormChangeList

class CustomFormChangeList(ChangeList):
    def __init__(self, request, model, list_display, list_display_links, list_filter, date_hierarchy, 
                 search_fields, list_select_related, list_per_page, list_max_show_all, list_editable, 
                 model_admin, sortable_by):
        super().__init__(request, model, list_display, list_display_links, list_filter, date_hierarchy,
                        search_fields, list_select_related, list_per_page, list_max_show_all, 
                        list_editable, model_admin, sortable_by)
        # Get form code from request
        form_code = request.GET.get('form_code')
        if form_code:
            # Convert camelCase to Title Case
            title = ''.join(' ' + char if char.isupper() else char for char in form_code).strip().title()
            self.title = f"{title} Forms"  # This will be used in the template