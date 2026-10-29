from django.db import models
from detection.models import DetectionRecord

class SecurityAlert(models.Model):
    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('warning', 'Warning'),
        ('low', 'Low'),
    ]

    STATUS_CHOICES = [
        ('new', 'New'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

    detection_record = models.ForeignKey(DetectionRecord, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='warning')
    prediction = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source_ip = models.CharField(max_length=50, blank=True, null=True)
    model_name = models.CharField(max_length=50, default='Random Forest')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.prediction} - {self.status}"
