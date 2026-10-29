from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from alerts.models import SecurityAlert
from datasets.models import Dataset
from detection.models import DetectionRecord
from detection.serializers import DetectionRecordSerializer

from .services import (
    alert_statistics,
    dashboard_summary,
    detection_activity,
    prediction_distribution,
    threat_categories,
)


def _requested_dataset_id(request):
    raw_dataset_id = request.query_params.get('dataset_id')
    if not raw_dataset_id:
        return None, None
    try:
        dataset_id = int(raw_dataset_id)
    except (TypeError, ValueError):
        return None, Response(
            {'error': 'dataset_id must be a positive integer.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if dataset_id < 1:
        return None, Response(
            {'error': 'dataset_id must be a positive integer.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not Dataset.objects.filter(pk=dataset_id, is_demo=False).exists():
        return None, Response(
            {'error': 'Dataset not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return dataset_id, None


def _filtered_detections(request, queryset=None):
    records = (
        queryset if queryset is not None else DetectionRecord.objects.all()
    ).exclude(dataset__is_demo=True)
    dataset_id, error = _requested_dataset_id(request)
    if error:
        return None, error
    if dataset_id is not None:
        records = records.filter(dataset_id=dataset_id)

    category = request.query_params.get('category')
    if category:
        records = records.filter(prediction__iexact=category.strip())
    search = request.query_params.get('search')
    if search:
        records = records.filter(
            prediction__icontains=search
        ) | records.filter(
            source_ip__icontains=search
        ) | records.filter(
            destination_ip__icontains=search
        )

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    parsed_start = parse_date(start_date) if start_date else None
    parsed_end = parse_date(end_date) if end_date else None
    if (start_date and not parsed_start) or (end_date and not parsed_end):
        return None, Response(
            {'error': 'Dates must use YYYY-MM-DD format.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if parsed_start and parsed_end and parsed_start > parsed_end:
        return None, Response(
            {'error': 'start_date must be on or before end_date.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if parsed_start:
        records = records.filter(timestamp__date__gte=parsed_start)
    if parsed_end:
        records = records.filter(timestamp__date__lte=parsed_end)
    return records, None


class DashboardSummaryView(APIView):
    def get(self, request):
        dataset_id, error = _requested_dataset_id(request)
        if error:
            return error
        return Response(dashboard_summary(dataset_id))


class DashboardActivityView(APIView):
    def get(self, request):
        raw_days = request.query_params.get('days', '14')
        try:
            days = int(raw_days)
        except (TypeError, ValueError):
            return Response(
                {'error': 'days must be an integer between 1 and 365.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not 1 <= days <= 365:
            return Response(
                {'error': 'days must be an integer between 1 and 365.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dataset_id, error = _requested_dataset_id(request)
        if error:
            return error
        records, error = _filtered_detections(request)
        if error:
            return error
        return Response(detection_activity(days, records, dataset_id))


class DashboardPredictionDistributionView(APIView):
    def get(self, request):
        dataset_id, error = _requested_dataset_id(request)
        if error:
            return error
        records, error = _filtered_detections(request)
        if error:
            return error
        return Response(prediction_distribution(records, dataset_id))


class DashboardThreatCategoriesView(APIView):
    def get(self, request):
        records, error = _filtered_detections(request)
        if error:
            return error
        return Response(threat_categories(records))


class DashboardAlertStatisticsView(APIView):
    def get(self, request):
        alerts = SecurityAlert.objects.all()
        dataset_id, error = _requested_dataset_id(request)
        if error:
            return error
        if dataset_id is not None:
            alerts = alerts.filter(detection_record__dataset_id=dataset_id)
        severity = request.query_params.get('severity')
        alert_status = request.query_params.get('status')
        if severity:
            if severity not in dict(SecurityAlert.SEVERITY_CHOICES):
                return Response(
                    {'error': 'Invalid severity.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            alerts = alerts.filter(severity=severity)
        if alert_status:
            if alert_status not in dict(SecurityAlert.STATUS_CHOICES):
                return Response(
                    {'error': 'Invalid status.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            alerts = alerts.filter(status=alert_status)
        return Response(alert_statistics(alerts))


class DashboardRecentDetectionsView(APIView):
    def get(self, request):
        records, error = _filtered_detections(request)
        if error:
            return error
        raw_limit = request.query_params.get('limit', '25')
        raw_offset = request.query_params.get('offset', '0')
        try:
            limit, offset = int(raw_limit), int(raw_offset)
        except (TypeError, ValueError):
            return Response(
                {'error': 'limit and offset must be integers.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not 1 <= limit <= 100 or offset < 0:
            return Response(
                {'error': 'limit must be 1-100 and offset must be non-negative.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        records = records.select_related('dataset').order_by('-timestamp')
        total = records.count()
        page = records[offset:offset + limit]
        next_offset = offset + limit if offset + limit < total else None
        return Response({
            'count': total,
            'next_offset': next_offset,
            'results': DetectionRecordSerializer(page, many=True).data,
        })
