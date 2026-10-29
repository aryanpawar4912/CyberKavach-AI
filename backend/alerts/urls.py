from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertStatisticsView, SecurityAlertViewSet

router = DefaultRouter()
router.register(r'', SecurityAlertViewSet)

urlpatterns = [
    path('statistics/', AlertStatisticsView.as_view(), name='alert-statistics'),
    path('', include(router.urls)),
]
