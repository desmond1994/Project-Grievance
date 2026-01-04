import os
from grievance_api.models import Grievance, User, Department, Category
from django.conf import settings
from django.db import connection

print("Grievance Reset - Users/Groups/Categories SAFE")

# Delete grievances + images
count = 0
for g in Grievance.objects.all():
    if hasattr(g, 'image') and g.image:
        img_path = os.path.join(settings.MEDIA_ROOT, g.image.name)
        if os.path.exists(img_path):
            os.remove(img_path)
    g.delete()
    count += 1
print("Deleted %d grievances" % count)

# SQLite ID reset
with connection.cursor() as cursor:
    cursor.execute("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'grievance_api_grievance'")
print("IDs reset to 1")

# Verify
print("Users: %d" % User.objects.count())
print("Depts: %d" % Department.objects.count())
print("Categories: %d" % Category.objects.count())
print("Grievances now: %d" % Grievance.objects.count())
print("RESET COMPLETE")



# Command to run:
# python manage.py shell < reset_grievances.py
