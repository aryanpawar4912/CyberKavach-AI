from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ModelComparisonView,
    ModelEvaluationMetricsView,
    ModelMetricsView,
    ModelTrainView,
    ModelViewSet,
)

router = DefaultRouter()
router.register(r'', ModelViewSet)

urlpatterns = [
    path('metrics/', ModelMetricsView.as_view(), name='model-metrics'),
    path('comparison/', ModelComparisonView.as_view(), name='model-comparison'),
    path('train/', ModelTrainView.as_view(), name='model-train'),
    path('<int:pk>/metrics/', ModelEvaluationMetricsView.as_view(), name='model-evaluation-metrics'),
    path('', include(router.urls)),
]
