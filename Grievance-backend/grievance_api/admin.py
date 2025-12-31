from django.contrib import admin
from .models import Grievance, Department, SubDepartment, Category

# Register all relevant models for admin management
admin.site.register(Grievance)
admin.site.register(Department)
admin.site.register(SubDepartment)
admin.site.register(Category)
