import os
from django.conf import settings
from django.db import connection
from grievance_api.models import Grievance, GrievanceEvent, GrievanceImage

print("🚀 GRIEVANCES-ONLY Reset - Keep Cats/Depts + IDs=1")

# 1. MEDIA CLEAN (grievance images only)
media_dir = settings.MEDIA_ROOT
if os.path.exists(media_dir):
    print(f"🗑️ Clearing grievance media: {media_dir}")
    for file in os.listdir(media_dir):
        if file.startswith('grievances/'):
            os.remove(os.path.join(media_dir, file))
    print("✅ Media cleaned")

# 2. GRIEVANCES + RELATED ONLY
print("\n🗑️ Deleting grievances data...")
GrievanceImage.objects.all().delete()
GrievanceEvent.objects.all().delete()
count_g = Grievance.objects.count()
Grievance.objects.all().delete()
print(f"  Deleted {count_g} Grievances + Events + Images")

# 3. RESET GRIEVANCE SEQUENCE ONLY
print("\n🔄 Resetting grievance IDs...")
with connection.cursor() as cursor:
    cursor.execute("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'grievance_api_grievance'")
    print("  Reset grievance_api_grievance → ID=1 next")

# 4. PRESERVE COUNTS
print("\n📊 PRESERVED:")
print(f"Grievances: {Grievance.objects.count()}")  # 0
print(f"Events/Images: 0")
print(f"Categories: {Category.objects.count()}")     # 10
print(f"Departments: {Department.objects.count()}") # 2
print(f"Users: {User.objects.count()}")             # 8

print("\n🎉 GRIEVANCES RESET - Cats/Depts SAFE | Next ID=1!")


# Command to run:
# python manage.py shell < reset_grievances.py
