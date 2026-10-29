from django.urls import path
from .views import NetworkTopologyView, NodeDetailView

urlpatterns = [
    path('topology/', NetworkTopologyView.as_view(), name='network-topology'),
    path('nodes/<str:node_id>/', NodeDetailView.as_view(), name='network-node-detail'),
]
