import os
import shutil
from django.conf import settings
from django.db import connection
from grievance_api.models import (
    Grievance, GrievanceEvent, User, Department, Category
)

print("🚀 COMPLETE Grievance Reset - Cleaning ALL data + files + sequences")

# 1. DELETE ALL MEDIA FILES (safer: delete entire dir)
media_dir = settings.MEDIA_ROOT
if os.path.exists(media_dir):
    print(f"🗑️  Deleting media directory: {media_dir}")
    shutil.rmtree(media_dir, ignore_errors=True)
    os.makedirs(media_dir, exist_ok=True)
    print("✅ Media folder cleaned + recreated")

# 2. DELETE ALL RELATED MODELS (cascade handles FKs)
print("\n🗑️  Deleting database records...")
models_to_delete = [
    GrievanceEvent, Grievance, Category, Department
]

counts = {}
for model in models_to_delete:
    count = model.objects.count()
    if count > 0:
        model.objects.all().delete()
        counts[model.__name__] = count
        print(f"  Deleted {count} {model.__name__}")

# 3. RESET ALL SQLite SEQUENCES (correct table names)
print("\n🔄 Resetting SQLite auto-increment sequences...")
with connection.cursor() as cursor:
    # List all sequences and reset
    cursor.execute("""
        SELECT name FROM sqlite_sequence 
        WHERE name LIKE 'grievance_api_%'
    """)
    sequences = cursor.fetchall()
    
    for (table_name,) in sequences:
        cursor.execute(f"""
            UPDATE sqlite_sequence SET seq = 0 WHERE name = '{table_name}'
        """)
        print(f"  Reset sequence: {table_name}")
    
    # Verify grievances sequence specifically
    cursor.execute("""
        UPDATE sqlite_sequence SET seq = 0 
        WHERE name = 'grievance_api_grievance'
    """)

print("✅ All sequences reset")

# 4. VERIFY CLEAN STATE
print("\n📊 FINAL COUNTS:")
print(f"Grievances: {Grievance.objects.count()}")
print(f"Events: {GrievanceEvent.objects.count()}")
print(f"Categories: {Category.objects.count()}")
print(f"Departments: {Department.objects.count()}")
print(f"Users: {User.objects.count()}")

print("\n🎉 RESET COMPLETE - Fresh database ready!")
print("💡 Next: python manage.py makemigrations && python manage.py migrate")



# Command to run:
# python manage.py shell < reset_grievances.py
