from django.db import models

class AuditLog(models.Model):
    actor = models.CharField(max_length=150, default='system')
    action = models.CharField(max_length=255)
    object_id = models.CharField(max_length=100, blank=True, null=True)
    outcome = models.CharField(max_length=50, default='success')
    is_demo = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.actor}: {self.action} ({self.outcome})"
