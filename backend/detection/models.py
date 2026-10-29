from django.db import models
from datasets.models import Dataset

class DetectionRecord(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.SET_NULL, null=True, blank=True, related_name='detections')
    trained_model = models.ForeignKey(
        'machine_learning.TrainedModel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detection_records',
    )
    model_name = models.CharField(max_length=50, default='random_forest')
    prediction = models.CharField(max_length=100)
    confidence = models.FloatField(null=True, blank=True)
    source_ip = models.CharField(max_length=50, blank=True, null=True)
    destination_ip = models.CharField(max_length=50, blank=True, null=True)
    destination_port = models.IntegerField(null=True, blank=True)
    features_json = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.prediction}] {self.source_ip} -> {self.destination_ip}"
