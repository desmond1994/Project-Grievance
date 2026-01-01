from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    admin = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='department_admin')
    def __str__(self):
        return self.name

class SubDepartment(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    parent_department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='subdepartments')
    def __str__(self):
        return f"{self.parent_department.name} -> {self.name}"

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    sub_department = models.ForeignKey(SubDepartment, on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')

    def save(self, *args, **kwargs):
        if self.sub_department and not self.department:
            self.department = self.sub_department.parent_department
        super().save(*args, **kwargs)

    def __str__(self):
        full_path = [self.name]
        p = self.parent
        while p is not None:
            full_path.append(p.name)
            p = p.parent
        return ' -> '.join(full_path[::-1])

    class Meta:
        verbose_name_plural = "Categories"

class Grievance(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Review', 'In Review'),        # Triage 7d
        ('Pending Approval', 'Pending Approval'),  # TopAuth 3d
        ('In Progress', 'In Progress'),    # Dept 7d + 14d ext
        ('Policy Decision', 'Policy Decision'),     # TopAuth review
        ('Resolved', 'Resolved'),
        ('Rejected', 'Rejected'),
]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grievances')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='category_grievances')
    other_category = models.CharField(max_length=200, blank=True, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    resolution_notes = models.TextField(blank=True, null=True)
    signed_document = models.FileField(upload_to='signed_documents/', blank=True, null=True)
    resolution_image = models.ImageField(upload_to='resolution_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    grievance_image = models.ImageField(upload_to='grievance_images/', null=True, blank=True)  # Fixed duplicate
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    
    # 🔥 SLA FIELDS - CORRECTLY INSIDE CLASS
    due_date = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        from django.utils import timezone
        from datetime import timedelta
        
        # 🔥 FULL Multi-Level SLA Timers
        if self.status == 'In Review':  # Triage
            self.due_date = timezone.now() + timedelta(days=7)
        elif self.status == 'Pending Approval':  # TopAuth 1st review
            self.due_date = timezone.now() + timedelta(days=3)
        elif self.status == 'In Progress':  # Dept (7d initial)
            if not self.due_date:  # New In Progress
                self.due_date = timezone.now() + timedelta(days=7)
        elif self.status == 'Policy Decision':  # TopAuth 2nd review
            self.due_date = timezone.now() + timedelta(days=5)  # Policy decision
        
        # 🔥 AUTO-ESCALATION Chain
        if self.due_date and self.due_date < timezone.now().date():
            if self.status == 'In Review':
                self.status = 'Pending Approval'  # Triage fail → TopAuth
            elif self.status == 'In Progress':
                self.status = 'Policy Decision'    # Dept fail → TopAuth Policy
            elif self.status == 'Pending Approval':
                self.status = 'Rejected'           # TopAuth fail → Close
        
        super().save(*args, **kwargs)


# Rest of your models (unchanged)
class GrievanceEvent(models.Model):
    grievance = models.ForeignKey('Grievance', related_name='events', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    notes = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    extra_data = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"{self.action} by {self.user.username if self.user else 'System'}"

class GrievanceImage(models.Model):
    grievance = models.ForeignKey(Grievance, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='grievance_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
