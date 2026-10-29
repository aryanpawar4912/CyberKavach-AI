import csv

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from datasets.models import Dataset
from machine_learning.models import TrainedModel
from dashboard.services import detection_activity, prediction_counts, threat_categories
from dashboard.views import _filtered_detections


class ReportSummaryView(APIView):
    def get(self, request):
        records, error = _filtered_detections(request)
        if error:
            return error

        counts = prediction_counts(records)
        return Response({
            'total_records': counts['total'],
            'benign': counts['benign'],
            'suspicious': counts['suspicious'],
            'unclassified': counts['unclassified'],
            'datasets_count': Dataset.objects.filter(
                detections__in=records
            ).distinct().count(),
            'models_evaluated': TrainedModel.objects.exclude(
                dataset__is_demo=True
            ).filter(
                evaluation_type='held_out_test',
                evaluation_timestamp__isnull=False,
            ).count(),
            'categories': threat_categories(records),
            'activity': detection_activity(queryset=records),
            'last_updated': timezone.now().isoformat(),
        })


class ReportExportView(APIView):
    def get(self, request):
        records, error = _filtered_detections(request)
        if error:
            return error
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="cyberkavach_threat_report.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Prediction', 'Confidence', 'Model', 'Source IP',
            'Destination IP', 'Timestamp',
        ])

        raw_limit = request.query_params.get('limit', '500')
        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            return Response(
                {'error': 'limit must be an integer between 1 and 5000.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not 1 <= limit <= 5000:
            return Response(
                {'error': 'limit must be an integer between 1 and 5000.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for record in records.order_by('-timestamp')[:limit]:
            writer.writerow([
                record.id,
                record.prediction,
                '' if record.confidence is None else f'{record.confidence:.4f}',
                record.model_name,
                record.source_ip or '',
                record.destination_ip or '',
                record.timestamp.isoformat(),
            ])
        return response
