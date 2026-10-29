import os

from rest_framework import serializers
from .models import TrainedModel

class TrainedModelSerializer(serializers.ModelSerializer):
    model_name_display = serializers.CharField(source='get_model_name_display', read_only=True)
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)
    artifact_available = serializers.SerializerMethodField()
    evaluation_available = serializers.SerializerMethodField()

    class Meta:
        model = TrainedModel
        fields = (
            'id', 'model_name', 'model_name_display', 'model_version',
            'dataset', 'dataset_name', 'evaluation_type',
            'evaluation_timestamp', 'evaluation_available', 'accuracy',
            'precision', 'recall', 'f1_score', 'false_positive_rate',
            'confusion_matrix', 'per_class_metrics', 'feature_importance',
            'features_used', 'target_classes', 'trained_at',
            'artifact_available',
        )

    def get_artifact_available(self, obj):
        return bool(obj.artifact_path and os.path.isfile(obj.artifact_path))

    def get_evaluation_available(self, obj):
        return obj.evaluation_type == 'held_out_test' and obj.evaluation_timestamp is not None
