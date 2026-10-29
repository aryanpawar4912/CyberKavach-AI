from rest_framework import serializers
from .models import DetectionRecord

class DetectionRecordSerializer(serializers.ModelSerializer):
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)

    class Meta:
        model = DetectionRecord
        fields = '__all__'
