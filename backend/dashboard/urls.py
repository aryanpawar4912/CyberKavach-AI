from django.urls import path
from .views import (
    DashboardActivityView,
    DashboardAlertStatisticsView,
    DashboardPredictionDistributionView,
    DashboardRecentDetectionsView,
    DashboardSummaryView,
    DashboardThreatCategoriesView,
)

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('activity/', DashboardActivityView.as_view(), name='dashboard-activity'),
    path('prediction-distribution/', DashboardPredictionDistributionView.as_view(), name='dashboard-prediction-distribution'),
    path('threat-categories/', DashboardThreatCategoriesView.as_view(), name='dashboard-threat-categories'),
    path('alert-statistics/', DashboardAlertStatisticsView.as_view(), name='dashboard-alert-statistics'),
    path('recent-detections/', DashboardRecentDetectionsView.as_view(), name='dashboard-recent-detections'),
]
