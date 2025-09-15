from django.contrib import admin
from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("id", "nombres", "apellidos", "documento", "email", "telefono", "creado_en")
    search_fields = ("nombres", "apellidos", "documento", "email", "telefono")
    list_filter = ("creado_en",)
