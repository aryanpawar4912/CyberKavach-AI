from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DatasetStatisticsView, DatasetViewSet, DatasetUploadView

router = DefaultRouter()
router.register(r'', DatasetViewSet)

urlpatterns = [
    path('upload/', DatasetUploadView.as_view(), name='dataset-upload'),
    path('<int:pk>/statistics/', DatasetStatisticsView.as_view(), name='dataset-statistics'),
    path('', include(router.urls)),
]
