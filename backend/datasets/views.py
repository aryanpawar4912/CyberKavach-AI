import numpy as np
import pandas as pd
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Dataset
from .serializers import DatasetSerializer
from .adapters import detect_schema, find_label_column

class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all().order_by('-uploaded_at')
    serializer_class = DatasetSerializer

    def get_queryset(self):
        return super().get_queryset().filter(is_demo=False)


class DatasetStatisticsView(APIView):
    def get(self, request, pk):
        try:
            dataset = Dataset.objects.get(pk=pk, is_demo=False)
        except Dataset.DoesNotExist:
            return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': dataset.id,
            'name': dataset.name,
            'status': dataset.status,
            'schema_type': dataset.schema_type,
            'rows': dataset.rows,
            'columns': dataset.columns,
            'missing_values': dataset.missing_values,
            'label_distribution': dataset.label_distribution,
            'features': dataset.features_list,
            'feature_summary': dataset.feature_summary,
            'file_size_bytes': dataset.file_size_bytes,
            'uploaded_at': dataset.uploaded_at,
            'error_message': dataset.error_message,
        })

class DatasetUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj.name.lower().endswith('.csv'):
            return Response({'error': 'Only CSV files are permitted.'}, status=status.HTTP_400_BAD_REQUEST)

        # File size validation (50 MB limit)
        if file_obj.size > 52428800:
            return Response({'error': 'File exceeds maximum size of 50 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        dataset = Dataset.objects.create(
            name=file_obj.name,
            file=file_obj,
            file_size_bytes=file_obj.size,
            status='processing'
        )

        try:
            df = pd.read_csv(dataset.file.path)
            if df.empty or not len(df.columns):
                raise ValueError('The CSV must include a header and at least one data row.')
            dataset.rows = len(df)
            dataset.columns = len(df.columns)
            dataset.schema_type = detect_schema(df.columns)
            dataset.features_list = [c.strip() for c in df.columns.tolist()]

            missing_dict = df.isnull().sum().to_dict()
            dataset.missing_values = {k: int(v) for k, v in missing_dict.items() if v > 0}

            label_col = find_label_column(df)
            if label_col:
                counts = df[label_col].dropna().astype(str).str.strip()
                counts = counts[counts.ne('')].value_counts().to_dict()
                dataset.label_distribution = {str(k): int(v) for k, v in counts.items()}

            summaries = {}
            for column in df.select_dtypes(include=['number']).columns:
                values = df[column].replace([np.inf, -np.inf], np.nan).dropna()
                if values.empty:
                    continue
                summaries[column] = {
                    'count': int(values.count()),
                    'mean': float(values.mean()),
                    'min': float(values.min()),
                    'max': float(values.max()),
                }
            dataset.feature_summary = summaries

            dataset.status = 'ready'
            dataset.save()

            return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)
        except (
            pd.errors.EmptyDataError,
            pd.errors.ParserError,
            UnicodeDecodeError,
            ValueError,
            OSError,
        ) as e:
            dataset.status = 'error'
            dataset.error_message = str(e)
            dataset.save()
            return Response({'error': f"Failed to parse CSV: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
