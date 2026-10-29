from rest_framework import serializers
from .models import Dataset

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = '__all__'
        read_only_fields = ('rows', 'columns', 'schema_type', 'status', 'is_demo', 'missing_values', 'label_distribution', 'features_list', 'feature_summary', 'uploaded_at', 'file_size_bytes')
