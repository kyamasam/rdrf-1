from django import template
from django.utils.translation import ugettext_lazy as _

register = template.Library()


@register.filter()
def get_form_type(dictionary, key):
    return dictionary.get(key)