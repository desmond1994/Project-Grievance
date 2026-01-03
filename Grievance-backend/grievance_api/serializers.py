from rest_framework import serializers
from .models import (
    Grievance, Department, Category, GrievanceEvent, GrievanceImage,
    SubDepartment
)
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']

    def validate(self, data):
        if data['password1'] != data['password2']:
            raise serializers.ValidationError("Passwords don't match")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password1']
        )
        return user

class GrievanceImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = GrievanceImage
        fields = ['id', 'image', 'uploaded_at']

    def get_image(self, obj):
        request = self.context.get('request')

        if not obj.image or not hasattr(obj.image, 'url'):
            return None

        url = obj.image.url
        return request.build_absolute_uri(url) if request else url




class GrievanceEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrievanceEvent
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    full_path = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'department', 'sub_department', 'full_path']
    
    def get_full_path(self, obj):
        return obj.name  # Simplified for leaf categories

class SubDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubDepartment
        fields = '__all__'

class GrievanceSerializer(serializers.ModelSerializer):
    images = GrievanceImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    # ✅ FIX: Proper category_id handling
    category_id = serializers.PrimaryKeyRelatedField(
    queryset=Category.objects.all(),
    source='category',
    write_only=True,
    required=False,
    allow_null=True,
)
    # ✅ user auto-filled by ViewSet - NOT in form
    user_name = serializers.CharField(source='user.username', read_only=True)
    signed_document = serializers.FileField(required=False, allow_null=True, allow_empty_file=True)
    resolution_image = serializers.ImageField(required=False, allow_null=True, allow_empty_file=True)
    resolution_notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Grievance
        fields = [
        'id', 'title', 'description', 'category_id', 'category', 'status',
        'department', 'department_name', 'location', 'due_date',
        'resolution_notes', 'signed_document', 'resolution_image',
        'images', 'user_name', 'created_at', 'user'
        ]

        read_only_fields = ['created_at', 'user', 'images']  # ✅ user read-only
        extra_kwargs = {
        'title': {'required': False, 'allow_blank': True},
        'description': {'required': True},
         }

    
    def validate(self, data):
        # ✅ Auto-generate title if missing
        if not data.get('title') and data.get('description'):
            data['title'] = data['description'][:50]
        return data


