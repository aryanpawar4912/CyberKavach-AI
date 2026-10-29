from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DetectionDetailView, DetectionHistoryViewSet, DetectionPredictView

router = DefaultRouter()
router.register(r'history', DetectionHistoryViewSet)

urlpatterns = [
    path('predict/', DetectionPredictView.as_view(), name='detection-predict'),
    path('<int:pk>/', DetectionDetailView.as_view(), name='detection-detail'),
    path('', include(router.urls)),
]
