from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from .models import SecurityAlert
from .serializers import SecurityAlertSerializer
from audit.models import AuditLog
from dashboard.services import alert_statistics

class SecurityAlertViewSet(viewsets.ModelViewSet):
    queryset = SecurityAlert.objects.all().order_by('-created_at')
    serializer_class = SecurityAlertSerializer

    def get_queryset(self):
        qs = super().get_queryset().exclude(detection_record__dataset__is_demo=True)
        sev = self.request.query_params.get('severity')
        if sev:
            if sev not in dict(SecurityAlert.SEVERITY_CHOICES):
                raise ValidationError({'severity': 'Invalid severity.'})
            qs = qs.filter(severity=sev)
        st = self.request.query_params.get('status')
        if st:
            if st not in dict(SecurityAlert.STATUS_CHOICES):
                raise ValidationError({'status': 'Invalid status.'})
            qs = qs.filter(status=st)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(prediction__icontains=search)
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user.username if self.request.user.is_authenticated else 'system',
            action=f"Updated alert status to {instance.status}",
            object_id=f"Alert-{instance.id}",
            outcome='success'
        )


class AlertStatisticsView(APIView):
    def get(self, request):
        alerts = SecurityAlert.objects.exclude(detection_record__dataset__is_demo=True)
        severity = request.query_params.get('severity')
        alert_status = request.query_params.get('status')
        if severity:
            if severity not in dict(SecurityAlert.SEVERITY_CHOICES):
                raise ValidationError({'severity': 'Invalid severity.'})
            alerts = alerts.filter(severity=severity)
        if alert_status:
            if alert_status not in dict(SecurityAlert.STATUS_CHOICES):
                raise ValidationError({'status': 'Invalid status.'})
            alerts = alerts.filter(status=alert_status)
        return Response(alert_statistics(alerts))
