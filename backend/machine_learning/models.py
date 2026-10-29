from django.db import models
from datasets.models import Dataset

class TrainedModel(models.Model):
    MODEL_CHOICES = [
        ('random_forest', 'Random Forest'),
        ('decision_tree', 'Decision Tree'),
        ('svm', 'Support Vector Machine'),
    ]

    model_name = models.CharField(max_length=50, choices=MODEL_CHOICES)
    model_version = models.CharField(max_length=100, blank=True, default='')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='models', null=True, blank=True)
    evaluation_type = models.CharField(max_length=30, blank=True, default='unavailable')
    evaluation_timestamp = models.DateTimeField(null=True, blank=True)
    accuracy = models.FloatField(default=0.0)
    precision = models.FloatField(default=0.0)
    recall = models.FloatField(default=0.0)
    f1_score = models.FloatField(default=0.0)
    false_positive_rate = models.FloatField(default=0.0)
    confusion_matrix = models.JSONField(default=list, blank=True)
    per_class_metrics = models.JSONField(default=dict, blank=True)
    feature_importance = models.JSONField(default=list, blank=True)
    artifact_path = models.CharField(max_length=500, blank=True, null=True)
    features_used = models.JSONField(default=list, blank=True)
    target_classes = models.JSONField(default=list, blank=True)
    trained_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_model_name_display()} ({self.accuracy * 100:.1f}%)"
