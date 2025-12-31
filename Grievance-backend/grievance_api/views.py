from urllib import request
from rest_framework import viewsets, permissions, generics, status, serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, SAFE_METHODS, BasePermission
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.parsers import JSONParser
from .serializers import (
    UserSerializer,
    GrievanceSerializer,
    DepartmentSerializer,
    CategorySerializer,
    GrievanceEventSerializer,
    SubDepartmentSerializer,
    UserRegistrationSerializer
)
from .models import Grievance, Department, SubDepartment, Category, GrievanceEvent, GrievanceImage
from rest_framework.parsers import MultiPartParser, FormParser
from transformers import pipeline
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication

# --- AI Complaint Type Suggestion ---
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

@api_view(['POST'])
def suggest_complaint_type(request):
    description = request.data.get('description', '')
    labels = [
        "Uncollected garbage", "Garbage dumping", "Contaminated water supply",
        "Mosquitoes problems", "Issues with food quality", "Pothole Repair",
        "Streetlight Malfunction", "Low Water Pressure", "Blocked Sewers / Drainage",
        "Stormwater Drain Issues", "Other"
    ]
    if not description:
        return Response({"suggestions": []})

    result = classifier(description, labels)
    top_suggestions = result['labels'][:3]
    return Response({"suggestions": top_suggestions})

# --- Custom Login ---
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
    else:
        return Response({'error': 'Invalid credentials'}, status=400)

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- Permissions ---
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

# --- Grievance ViewSet ---
class GrievanceViewSet(viewsets.ModelViewSet):
    serializer_class = GrievanceSerializer
    permission_classes = [IsAuthenticated]  # temp [IsOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user

        if user.groups.filter(name='TOP_AUTHORITY').exists():
            return Grievance.objects.all()

        if user.groups.filter(name='DEPARTMENT_ADMIN').exists():
            try:
                department = Department.objects.get(admin=user)
            except Department.DoesNotExist:
                return Grievance.objects.none()
            return Grievance.objects.filter(department=department)

        if user.groups.filter(name='TRIAGE_USER').exists():
            return Grievance.objects.filter(department__name='Grievance Triage')

        if user.is_staff:
            return Grievance.objects.all()

        # ✅ FIX: User sees OWN grievances REGARDLESS of status/category
        return Grievance.objects.filter(user=user).order_by('-created_at')


    def perform_create(self, serializer):
        category_instance = serializer.validated_data.get('category')
        
        if not category_instance:
            raise serializers.ValidationError("A complaint category is required.")
        
        description = serializer.validated_data.get('description', '')
        title = description[:50] or "Untitled Grievance"
        
        print("FILES received in perform_create:", self.request.FILES)
        images = self.request.FILES.getlist('images')
        print(f"Number of images uploaded: {len(images)}")
        
        # ✅ Save grievance FIRST
        grievance = serializer.save(user=self.request.user, title=title)
        
        # ✅ Set category/department AFTER save
        if category_instance.name.strip().lower() == "other":
            status_val = "Pending"
            in_review_category = Category.objects.filter(name__iexact='In Review').first()
            if not in_review_category or not in_review_category.department:
                raise serializers.ValidationError("In Review category missing department.")
            grievance.category = in_review_category
            grievance.department = in_review_category.department
            grievance.status = status_val
        else:
            if not category_instance.department:
                raise serializers.ValidationError(f"Category '{category_instance.name}' needs department.")
            grievance.category = category_instance
            grievance.department = category_instance.department
            grievance.status = "Pending"
        
        grievance.save()
        
        # ✅ Images AFTER grievance exists
        for img_file in images:
            GrievanceImage.objects.create(grievance=grievance, image=img_file)
        
        # ✅ Event AFTER grievance exists
        GrievanceEvent.objects.create(
            grievance=grievance,
            user=self.request.user,
            action="Created",
            notes=f"Grievance created. Status: {grievance.status}"
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        images = self.request.FILES.getlist('images')
        for img_file in images:
            GrievanceImage.objects.create(grievance=instance, image=img_file)
        GrievanceEvent.objects.create(
            grievance=instance,
            user=self.request.user,
            action="Edited",
            notes=f"Fields updated: status={instance.status}, notes={instance.resolution_notes}"
        )

    @action(detail=True, methods=['post'], url_path='reopen', permission_classes=[IsAuthenticated], parser_classes=[JSONParser])
    def reopen(self, request, pk=None):
        grievance = self.get_object()
        if grievance.status not in ['Resolved', 'Rejected']:
            return Response(
                {'error': 'Only resolved or rejected grievances can be reopened.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'Reopen reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
        grievance.status = 'Reopened'
        grievance.save(update_fields=['status'])
        GrievanceEvent.objects.create(
            grievance=grievance,
            user=request.user,
            action='Reopened',
            notes=f'Reopened with reason: {reason}'
        )
        serializer = self.get_serializer(grievance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        grievance = Grievance.objects.get(id=pk)
        
        new_status = request.data.get('status')
        if not new_status or new_status not in [choice[0] for choice in Grievance.STATUS_CHOICES]:
            return Response({'error': 'Valid status required: Pending, In Progress, Resolved, Rejected'}, status=400)
        
        notes = request.data.get('resolution_notes', '')
        
        grievance.status = new_status
        grievance.resolution_notes = notes
        grievance.save()
        
        GrievanceEvent.objects.create(
            grievance=grievance, user=request.user,
            action=f"Status: {new_status}", notes=notes
        )
        
        serializer = self.get_serializer(grievance)
        return Response(serializer.data)



# --- TriageGrievanceViewSet WITH FIXED @action INSIDE CLASS ---
class TriageGrievanceViewSet(viewsets.ModelViewSet):
    serializer_class = GrievanceSerializer
    permission_classes = [IsTriageUser]

    def get_queryset(self):
        return Grievance.objects.filter(
            category__name__in=["Other", "In Review"]
        ).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        grievance = self.get_object()
        new_category_id = request.data.get('category_id')
        
        if not new_category_id:
            return Response({'error': 'category_id required'}, status=400)
        
        new_category = Category.objects.select_related(
            'department', 
            'sub_department__parent_department'
        ).get(id=new_category_id)
        
        grievance.category = new_category
        grievance.status = 'Pending'
        
        if new_category.sub_department:
            grievance.department = new_category.sub_department.parent_department
        elif new_category.department:
            grievance.department = new_category.department
        else:
            return Response({'error': f'{new_category.name} has no department'}, status=400)
        
        grievance.save()
        
        GrievanceEvent.objects.create(
            grievance=grievance,
            user=request.user,
            action='Triage Assigned',
            notes=f'{new_category.name} → {grievance.department.name}'
        )
        
        return Response({
            'success': True,
            'new_category': new_category.name,
            'department': grievance.department.name,
            'department_id': grievance.department.id
        })

# --- Other ViewSets ---
class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class SubDepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubDepartment.objects.all()
    serializer_class = SubDepartmentSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        return Category.objects.filter(subcategories__isnull=True)
    serializer_class = CategorySerializer

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class AdminGrievanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GrievanceSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        user = self.request.user

        if user.groups.filter(name='TOP_AUTHORITY').exists():
            return Grievance.objects.all().order_by('-created_at')

        if user.groups.filter(name='DEPARTMENT_ADMIN').exists():
            try:
                department = Department.objects.get(admin=user)
            except Department.DoesNotExist:
                return Grievance.objects.none()
            return Grievance.objects.filter(department=department).order_by('-created_at')

        return Grievance.objects.none()

class MeView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class GrievanceEventListView(generics.ListAPIView):
    serializer_class = GrievanceEventSerializer
    def get_queryset(self):
        grievance_id = self.kwargs['grievance_id']
        return GrievanceEvent.objects.filter(grievance_id=grievance_id).order_by('-timestamp')
