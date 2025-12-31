from rest_framework import serializers
from .models import Grievance, Department, SubDepartment, Category, GrievanceEvent, GrievanceImage
from django.contrib.auth.models import User

# --- Department Serializer ---
class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description']

# --- SubDepartment Serializer ---
class SubDepartmentSerializer(serializers.ModelSerializer):
    parent_department = DepartmentSerializer(read_only=True)
    class Meta:
        model = SubDepartment
        fields = ['id', 'name', 'description', 'parent_department']

# --- Category Serializer ---
class CategorySerializer(serializers.ModelSerializer):
    full_path = serializers.SerializerMethodField()
    sub_department = SubDepartmentSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'parent', 
            'sub_department', 'department', 'full_path', 'subcategories'
        ]

    def get_full_path(self, obj):
        return str(obj)

    def get_subcategories(self, obj):
        children = obj.subcategories.all()
        return CategorySerializer(children, many=True).data

# --- GrievanceImage Serializer ---
class GrievanceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrievanceImage
        fields = ['image']

# --- Grievance Serializer (COMPLETE FIX) ---
class GrievanceSerializer(serializers.ModelSerializer):
    # ✅ FIXED - Accepts string/number from frontend
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category',
        write_only=True
    )

    title = serializers.CharField(required=False, allow_blank=True)
    
    # ✅ DEFINE ALL read-only computed fields
    category_name = serializers.CharField(source='category.name', read_only=True)
    department_name = serializers.CharField(source='category.department.name', read_only=True)
    sub_department_name = serializers.CharField(source='category.sub_department.name', read_only=True)
    
    signed_document = serializers.FileField(required=False, allow_null=True)
    resolution_image = serializers.ImageField(required=False, allow_null=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    location = serializers.CharField(required=False, allow_blank=True)
    resolution_images = GrievanceImageSerializer(many=True, read_only=True, source='images')

    class Meta:
        model = Grievance
        fields = [
            'id', 'user', 'title', 'description', 'status', 'created_at', 'updated_at',
            'category', 'category_id', 'category_name', 'department_name', 
            'sub_department_name', 'location', 'resolution_notes', 'signed_document',
            'resolution_image', 'resolution_images', 'other_category'
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at', 'category_name', 
            'department_name', 'sub_department_name', 'resolution_images'
        ]

    def create(self, validated_data):
        category_id = validated_data.pop('category_id', None)
        category = validated_data.pop('category', None)
        
        # Use category_id if provided, fallback to category
        if category_id:
            category = Category.objects.get(id=category_id)
        elif not category:
            raise serializers.ValidationError("Category is required.")
        
        validated_data['category'] = category
        
        # Generate title from description
        description = validated_data.get('description', '')
        validated_data['title'] = description[:50] or "Untitled Grievance"
        
        return super().create(validated_data)

# --- User Serializer ---
class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_staff', 'groups')

    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]

# --- Grievance Event Serializer ---
class GrievanceEventSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    class Meta:
        model = GrievanceEvent
        fields = ['id', 'action', 'notes', 'timestamp', 'user']

# --- User Registration Serializer ---
class UserRegistrationSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password1', 'password2')
        extra_kwargs = {
            'username': {'required': True},
            'email': {'required': False}
        }

    def validate(self, data):
        if data['password1'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password1']
        )
        return user
