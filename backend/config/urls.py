import os

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from django.views.decorators.http import require_GET
from machine_learning.models import TrainedModel

@require_GET
def health_check(request):
    db_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        db_ok = False

    available_models = None
    if db_ok:
        available_models = sum(
            1 for model in TrainedModel.objects.exclude(
                dataset__is_demo=True
            ).only('artifact_path')
            if model.artifact_path and os.path.isfile(model.artifact_path)
        )

    return JsonResponse({
        'status': 'healthy' if db_ok else 'degraded',
        'backend': True,
        'database_connected': db_ok,
        'available_model_artifacts': available_models,
        'version': '1.0.0',
        'environment': 'development' if settings.DEBUG else 'production',
    }, status=200 if db_ok else 503)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', health_check, name='health-check'),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/dashboard/', include('dashboard.urls')),
    path('api/v1/network/', include('network.urls')),
    path('api/v1/datasets/', include('datasets.urls')),
    path('api/v1/detection/', include('detection.urls')),
    path('api/v1/models/', include('machine_learning.urls')),
    path('api/v1/alerts/', include('alerts.urls')),
    path('api/v1/incidents/', include('incidents.urls')),
    path('api/v1/reports/', include('reports.urls')),
    path('api/v1/audit/', include('audit.urls')),
]
