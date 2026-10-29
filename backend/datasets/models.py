from django.db import models

class Dataset(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('error', 'Error'),
    ]

    SCHEMA_CHOICES = [
        ('cicids2017', 'CICIDS2017'),
        ('nsl_kdd', 'NSL-KDD'),
        ('unsw_nb15', 'UNSW-NB15'),
        ('generic', 'Generic Network Flow'),
    ]

    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='datasets/')
    file_size_bytes = models.BigIntegerField(default=0)
    rows = models.IntegerField(default=0)
    columns = models.IntegerField(default=0)
    schema_type = models.CharField(max_length=50, choices=SCHEMA_CHOICES, default='generic')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_demo = models.BooleanField(default=False)
    missing_values = models.JSONField(default=dict, blank=True)
    label_distribution = models.JSONField(default=dict, blank=True)
    features_list = models.JSONField(default=list, blank=True)
    feature_summary = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.rows} rows)"
