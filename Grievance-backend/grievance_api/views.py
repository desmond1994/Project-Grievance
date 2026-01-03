from rest_framework import viewsets, permissions, generics, status, serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, SAFE_METHODS, BasePermission
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from .serializers import (
    UserSerializer,
    GrievanceSerializer,
    DepartmentSerializer,
    CategorySerializer,
    GrievanceEventSerializer,
    SubDepartmentSerializer,
    UserRegistrationSerializer,
    GrievanceImageSerializer,
)
from .models import Grievance, Department, SubDepartment, Category, GrievanceEvent, GrievanceImage
from transformers import pipeline
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication
from django.db.models import Count
from django.shortcuts import get_object_or_404

# AI Complaint Type Suggestion
classifier = None  # ✅ do not load model here

@api_view(['POST'])
def suggest_complaint_type(request):
    global classifier
    if classifier is None:
        classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

    description = request.data.get('description', '')
    labels = [
        "Uncollected garbage", "Garbage dumping", "Contaminated water supply",
        "Mosquitoes problems", "Issues with food quality", "Pothole Repair",
        "Streetlight Malfunction", "Low Water Pressure", "Blocked Sewers / Drainage",
        "Stormwater Drain Issues", "Other"
    ]
    if not description:
        return Response({"suggestions": []})

    result = classifier(description, candidate_labels=labels)
    return Response({"suggestions": result["labels"][:3]})

@api_view(['POST'])
@permission_classes([AllowAny])
def custom_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user).data
        return Response({
            'token': token.key,
            'user': user_data
        })
    return Response({'error': 'Invalid credentials'}, status=400)

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj.user == request.user

class IsTriageUser(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.groups.filter(name='TRIAGE_USER').exists()
        )

class GrievanceViewSet(viewsets.ModelViewSet):
    serializer_class = GrievanceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        if user.groups.filter(name='TOP_AUTHORITY').exists():
            return Grievance.objects.all()
        if user.groups.filter(name='DEPARTMENT_ADMIN').exists():
            departments = Department.objects.filter(admin=user)
            if not departments.exists():
                return Grievance.objects.none()
            return Grievance.objects.filter(department__in=departments)
        if user.groups.filter(name='TRIAGE_USER').exists():
            return (
                Grievance.objects
                .filter(category__name="Other", status="In Review")
                .order_by('-created_at')
            )
        if user.is_staff:
            return Grievance.objects.all()
        return Grievance.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        print("🔍 DATA:", dict(self.request.data))
        print("🔍 FILES:", [f.name for f in self.request.FILES.getlist('images')])
        user = self.request.user
        
        grievance = serializer.save(user=user)
        
        for img_file in self.request.FILES.getlist('images'):
            GrievanceImage.objects.create(
                grievance=grievance,
                image=img_file
            )
        
        if user.groups.filter(name='TRIAGE_USER').exists():
            other_category = get_object_or_404(Category, name="Other")
            grievance.category = other_category
            grievance.status = "In Review"
            grievance.department = other_category.department
            grievance.save()
            print(f"✅ Triage User: Dept={grievance.department.name}")
            return
        
        category = grievance.category
        if category.name == "Other":
            other_category = get_object_or_404(Category, name="Other")
            grievance.category = other_category
            grievance.status = "In Review"
            grievance.department_id = 10  # Triage Dept ID
            grievance.save()
            print(f"✅ Citizen Other → Triage Dept ID=10")
            return
        
        if category and category.department:
            grievance.department = category.department
            grievance.save(update_fields=['department'])
            print(f"✅ Normal: {category.name} → Dept={grievance.department.name}")

    def perform_update(self, serializer):
        grievance = self.get_object()
        old_status = grievance.status
        old_due_date = grievance.due_date
        old_resolution_notes = grievance.resolution_notes
        old_signed_document = grievance.signed_document.name if grievance.signed_document else None
        old_resolution_image = grievance.resolution_image.name if grievance.resolution_image else None

        updated = serializer.save()

        # Triage reassignment: Auto-set department + status
        if self.request.user.groups.filter(name='TRIAGE_USER').exists() and updated.category and updated.category.department:
            updated.department = updated.category.department
            updated.status = "Pending"
            updated.save(update_fields=['department', 'status'])
            print(f"✅ Triage reassigned: {updated.category.name} → {updated.department.name}")

        # Event logging (runs after all updates)
        if old_status != updated.status:
            GrievanceEvent.objects.create(
                grievance=updated,
                user=self.request.user,
                action='STATUS_CHANGED',
                notes=f'{old_status} -> {updated.status}'
            )
        if old_due_date != updated.due_date:
            GrievanceEvent.objects.create(
                grievance=updated,
                user=self.request.user,
                action='DUE_DATE_UPDATED',
                notes=f'{old_due_date} -> {updated.due_date}'
            )
        if old_resolution_notes != updated.resolution_notes:
            GrievanceEvent.objects.create(
                grievance=updated,
                user=self.request.user,
                action='RESOLUTION_NOTES_UPDATED',
                notes='Updated'
            )
        new_signed_document = updated.signed_document.name if updated.signed_document else None
        if old_signed_document != new_signed_document and new_signed_document:
            GrievanceEvent.objects.create(
                grievance=updated,
                user=self.request.user,
                action='SIGNED_DOCUMENT_UPLOADED',
                notes=new_signed_document
            )
        new_resolution_image = updated.resolution_image.name if updated.resolution_image else None
        if old_resolution_image != new_resolution_image and new_resolution_image:
            GrievanceEvent.objects.create(
                grievance=updated,
                user=self.request.user,
                action='RESOLUTION_IMAGE_UPLOADED',
                notes=new_resolution_image
            )

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser], permission_classes=[IsAuthenticated, IsOwnerOrAdmin])
    def upload_image(self, request, pk=None):
        grievance = self.get_object()
        file = request.FILES.get('image')
        if not file:
            return Response({'error': 'No image provided. Use FormData key: image'}, status=status.HTTP_400_BAD_REQUEST)
        img = GrievanceImage.objects.create(grievance=grievance, image=file)
        return Response(
            GrievanceImageSerializer(img, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )



class TriageGrievanceViewSet(viewsets.ModelViewSet):
    serializer_class = GrievanceSerializer
    permission_classes = [IsTriageUser]
    def get_queryset(self):
        return (
            Grievance.objects
                .filter(category__name="Other", status="In Review")
                .select_related('category')
                .order_by('-created_at')
        )
    
    def get_permissions(self):
        if self.action == 'partial_update':  # PATCH
            return [IsTriageUser()]  # Allow triage PATCH
        return [IsAuthenticated()]

class AdminGrievanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GrievanceSerializer
    
    def get_permissions(self):
        if self.action == 'grant_extension':
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [p() for p in permission_classes]

    
    def get_queryset(self):
        user = self.request.user
        if user.groups.filter(name='TOP_AUTHORITY').exists():
            return Grievance.objects.all().order_by('-created_at')
        return Grievance.objects.none()
    
  


    @action(detail=True, methods=['post'])
    def grant_extension(self, request, pk=None):
        grievance = self.get_object()
        if grievance.status not in ['Policy Decision', 'Pending Approval']:
            return Response({'error': f'Invalid status: {grievance.status}'}, status=400)
        if grievance.due_date:
            grievance.due_date += timedelta(days=14)
        else:
            grievance.due_date = timezone.now().date() + timedelta(days=14)
        grievance.save(update_fields=['due_date'])
        GrievanceEvent.objects.create(grievance=grievance, user=request.user, action='SLA_EXTENSION_GRANTED', notes=f'14-day extension')
        return Response({'message': 'Extension granted', 'new_due_date': grievance.due_date.isoformat()})

class AdminStatsViewSet(viewsets.ViewSet):
    def list(self, request):
        today = timezone.now().date()
        stats = {
            'total': Grievance.objects.count(),
            'pending': Grievance.objects.filter(status__in=['Pending', 'Pending at Triage']).count(),
            'in_progress': Grievance.objects.filter(status='In Progress').count(),
            'resolved': Grievance.objects.filter(status='Resolved').count(),
            'overdue': Grievance.objects.filter(due_date__lt=today).count(),
        }
        stats['sla'] = {
            'healthy': Grievance.objects.filter(due_date__gte=today).count(),
            'warning': Grievance.objects.filter(due_date__range=[today - timedelta(days=3), today]).count(),
            'critical': Grievance.objects.filter(due_date__lt=today - timedelta(days=3)).count(),
        }
        stats['by_dept'] = list(
            Grievance.objects.values('department__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )  # ✅ Convert QuerySet to list for JSON
        return Response(stats)



# Single instances - no duplicates
class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class SubDepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubDepartment.objects.all()
    serializer_class = SubDepartmentSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]  # ✅ Public read for dropdowns
    def get_queryset(self):
        return Category.objects.filter(subcategories__isnull=True)
    serializer_class = CategorySerializer

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class MeView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class GrievanceEventListView(generics.ListAPIView):
    serializer_class = GrievanceEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        grievance_id = self.kwargs['grievance_id']
        grievance = get_object_or_404(Grievance, id=grievance_id)

        # same access rules as GrievanceViewSet
        user = self.request.user
        if user.is_staff or user.groups.filter(name='TOP_AUTHORITY').exists():
            pass
        elif user.groups.filter(name='DEPARTMENT_ADMIN').exists():
            if not Department.objects.filter(admin=user, id=grievance.department_id).exists():
                return GrievanceEvent.objects.none()
        elif user.groups.filter(name='TRIAGE_USER').exists():
            if not (grievance.category and grievance.category.name == "Other" and grievance.status == "In Review"):
                return GrievanceEvent.objects.none()



        return GrievanceEvent.objects.filter(grievance_id=grievance_id).order_by('-timestamp')
