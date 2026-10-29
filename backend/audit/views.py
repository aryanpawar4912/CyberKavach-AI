from rest_framework import viewsets
from django.db.models import Q
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.filter(is_demo=False).order_by('-timestamp')
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(actor__icontains=search) | Q(action__icontains=search)
            )
        return qs
