# backend/grievance_api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.utils import timezone
from datetime import timedelta
from .views import (
    GrievanceViewSet,
    TriageGrievanceViewSet,
    DepartmentViewSet,
    SubDepartmentViewSet,
    CategoryViewSet,
    UserViewSet,
    AdminGrievanceViewSet,
    MeView,
    custom_login,
    UserRegistrationView,
    suggest_complaint_type,
    GrievanceEventListView,
)
from rest_framework.authtoken import views as drf_authtoken_views

router = DefaultRouter()
router.register(r'grievances', GrievanceViewSet, basename='grievance')
router.register(r'triage-grievances', TriageGrievanceViewSet, basename='triage-grievance')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'subdepartments', SubDepartmentViewSet, basename='subdepartment')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'users', UserViewSet, basename='user')
router.register(r'admin-grievances', AdminGrievanceViewSet, basename='admin-grievance')

urlpatterns = [
    path('auth/login/', custom_login, name='custom-login'),
    path('auth/register/', UserRegistrationView.as_view(), name='user-register'),
    path('me/', MeView.as_view(), name='me'),
    path('suggest-complaint-type/', suggest_complaint_type, name='suggest-complaint-type'),
    path('grievances/<int:grievance_id>/events/', GrievanceEventListView.as_view(),
         name='grievance-events'),
    path('', include(router.urls)),
]
