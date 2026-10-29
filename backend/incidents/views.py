from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Incident
from .serializers import IncidentSerializer
from audit.models import AuditLog
from django.utils import timezone

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.filter(is_demo=False).order_by('-created_at')
    serializer_class = IncidentSerializer

    def update(self, request, *args, **kwargs):
        incident = self.get_object()
        new_note = request.data.get('note')
        if new_note:
            notes = incident.notes or []
            notes.append({
                'text': new_note,
                'author': request.user.username if request.user.is_authenticated else 'system',
                'at': timezone.now().isoformat()
            })
            incident.notes = notes

        new_status = request.data.get('status')
        if new_status:
            incident.status = new_status

        incident.save()

        AuditLog.objects.create(
            actor=request.user.username if request.user.is_authenticated else 'system',
            action=f"Updated Incident #{incident.id} ({incident.status})",
            object_id=f"INC-{incident.id}",
            outcome='success'
        )

        return Response(IncidentSerializer(incident).data)
