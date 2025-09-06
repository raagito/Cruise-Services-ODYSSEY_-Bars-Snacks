from django.db import models


class Cliente(models.Model):
    """Modelo para almacenar información de los clientes"""
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100, blank=True, default="")
    documento = models.CharField(max_length=50, blank=True, default="", help_text="DNI/Pasaporte")
    email = models.EmailField(blank=True, default="")
    telefono = models.CharField(max_length=30, blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["-creado_en"]

    def __str__(self):
        nombre_completo = f"{self.nombres} {self.apellidos}".strip()
        return nombre_completo or self.documento or self.email or f"Cliente {self.pk}"