import os
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from alerts.models import SecurityAlert
from datasets.models import Dataset
from detection.models import DetectionRecord
from machine_learning.models import TrainedModel


BENIGN_LABELS = {'benign', 'normal', '0'}
UNKNOWN_LABELS = {'', 'unknown', 'unclassified', 'n/a', 'na', 'none', 'null'}
ACTIVE_ALERT_STATUSES = {'new', 'investigating'}


def _normalise_label(value):
    return str(value or '').strip().casefold()


def _supported_labels_by_model(dataset_id=None):
    labels_by_model = {}
    models = TrainedModel.objects.exclude(dataset__is_demo=True).only(
        'id', 'dataset_id', 'model_name', 'target_classes'
    )
    if dataset_id is not None:
        models = models.filter(dataset_id=dataset_id)
    for model in models:
        labels_by_model[model.pk] = {
            'dataset_id': model.dataset_id,
            'model_names': {
                _normalise_label(model.model_name),
                _normalise_label(model.get_model_name_display()),
            },
            'labels': {
                _normalise_label(label)
                for label in (model.target_classes or [])
                if _normalise_label(label) not in BENIGN_LABELS | UNKNOWN_LABELS
            },
        }
    return labels_by_model


def _prediction_class(prediction, trained_model_id, model_name, dataset_id, labels_by_model):
    label = _normalise_label(prediction)
    if label in BENIGN_LABELS:
        return 'benign'
    model = labels_by_model.get(trained_model_id)
    if (
        model
        and model['dataset_id'] == dataset_id
        and _normalise_label(model_name) in model['model_names']
        and label in model['labels']
    ):
        return 'suspicious'
    return 'unclassified'


def prediction_counts(queryset=None, dataset_id=None):
    records = (
        queryset if queryset is not None else DetectionRecord.objects.all()
    ).exclude(dataset__is_demo=True)
    labels_by_model = _supported_labels_by_model(dataset_id)
    counts = records.values(
        'trained_model_id', 'dataset_id', 'model_name', 'prediction'
    ).annotate(count=Count('id'))
    totals = {'benign': 0, 'suspicious': 0, 'unclassified': 0}
    for row in counts:
        category = _prediction_class(
            row['prediction'],
            row['trained_model_id'],
            row['model_name'],
            row['dataset_id'],
            labels_by_model,
        )
        totals[category] += row['count']
    total = sum(totals.values())
    return {
        'total': total,
        **totals,
    }


def dashboard_summary(dataset_id=None):
    models = TrainedModel.objects.exclude(dataset__is_demo=True).only('artifact_path')
    datasets = Dataset.objects.filter(status='ready', is_demo=False)
    detections = DetectionRecord.objects.exclude(dataset__is_demo=True)
    alerts = SecurityAlert.objects.exclude(detection_record__dataset__is_demo=True)
    if dataset_id is not None:
        models = models.filter(dataset_id=dataset_id)
        datasets = datasets.filter(pk=dataset_id)
        detections = detections.filter(dataset_id=dataset_id)
        alerts = alerts.filter(detection_record__dataset_id=dataset_id)
    available_models = [
        model for model in models
        if model.artifact_path and os.path.isfile(model.artifact_path)
    ]
    counts = prediction_counts(detections, dataset_id)
    return {
        'total_records': counts['total'],
        'benign': counts['benign'],
        'suspicious': counts['suspicious'],
        'unclassified': counts['unclassified'],
        'active_alerts': alerts.filter(status__in=ACTIVE_ALERT_STATUSES).count(),
        'datasets_processed': datasets.count(),
        'available_models': len(available_models),
        'last_updated': timezone.now().isoformat(),
    }


def detection_activity(days=14, queryset=None, dataset_id=None):
    now = timezone.localtime()
    start_date = (now - timedelta(days=days - 1)).date()
    if queryset is None:
        queryset = DetectionRecord.objects.all()
    queryset = queryset.exclude(dataset__is_demo=True).filter(
        timestamp__date__gte=start_date,
        timestamp__lte=now,
    )
    labels_by_model = _supported_labels_by_model(dataset_id)
    rows = list(
        queryset.annotate(day=TruncDate('timestamp', tzinfo=timezone.get_current_timezone()))
        .values('day', 'trained_model_id', 'dataset_id', 'model_name', 'prediction')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    if not rows:
        return []

    totals = {}
    for row in rows:
        day = row['day']
        bucket = totals.setdefault(day, {'benign': 0, 'suspicious': 0, 'unclassified': 0})
        category = _prediction_class(
            row['prediction'],
            row['trained_model_id'],
            row['model_name'],
            row['dataset_id'],
            labels_by_model,
        )
        bucket[category] += row['count']

    first_day, last_day = min(totals), max(totals)
    activity = []
    current_day = first_day
    while current_day <= last_day:
        values = totals.get(
            current_day, {'benign': 0, 'suspicious': 0, 'unclassified': 0}
        )
        activity.append({
            'date': current_day.isoformat(),
            **values,
        })
        current_day += timedelta(days=1)
    return activity


def prediction_distribution(queryset=None, dataset_id=None):
    counts = prediction_counts(queryset, dataset_id)
    return [
        {'name': 'Benign', 'value': counts['benign']},
        {'name': 'Suspicious', 'value': counts['suspicious']},
        {'name': 'Unclassified', 'value': counts['unclassified']},
    ]


def threat_categories(queryset=None, dataset_id=None):
    records = (
        queryset if queryset is not None else DetectionRecord.objects.all()
    ).exclude(dataset__is_demo=True)
    labels_by_model = _supported_labels_by_model(dataset_id)
    rows = (
        records.values('trained_model_id', 'dataset_id', 'model_name', 'prediction')
        .annotate(count=Count('id'))
        .order_by('-count', 'prediction')
    )
    categories = {}
    for row in rows:
        if _prediction_class(
            row['prediction'],
            row['trained_model_id'],
            row['model_name'],
            row['dataset_id'],
            labels_by_model,
        ) == 'suspicious':
            categories[row['prediction']] = (
                categories.get(row['prediction'], 0) + row['count']
            )
    return [
        {'name': name, 'value': count}
        for name, count in sorted(
            categories.items(), key=lambda item: (-item[1], item[0])
        )[:20]
    ]


def alert_statistics(queryset=None):
    alerts = (
        queryset if queryset is not None else SecurityAlert.objects.all()
    ).exclude(detection_record__dataset__is_demo=True)
    return {
        'total': alerts.count(),
        'by_severity': list(
            alerts.values('severity').annotate(count=Count('id')).order_by('severity')
        ),
        'by_status': list(
            alerts.values('status').annotate(count=Count('id')).order_by('status')
        ),
        'active': alerts.filter(status__in=ACTIVE_ALERT_STATUSES).count(),
    }
