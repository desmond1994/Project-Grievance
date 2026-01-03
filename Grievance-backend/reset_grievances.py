#!/usr/bin/env python
"""
Django management command to reset Grievance + GrievanceEvent data to ID:1
Run: python manage.py shell < reset_grievances.py
"""

from grievance_api.models import Grievance, GrievanceEvent
from django.db import connection

print("🚀 Resetting Grievance data...")

# 1. Delete all data
print("Deleting Grievance records...")
Grievance.objects.all().delete()

print("Deleting GrievanceEvent records...")
GrievanceEvent.objects.all().delete()

# 2. Reset SQLite sequences (ID:1)
print("Resetting ID sequences...")
cursor = connection.cursor()
cursor.execute("DELETE FROM sqlite_sequence WHERE name LIKE '%grievance%';")
connection.commit()

print("✅ COMPLETE! New grievances start at ID:1")
print("💡 Test: Submit grievance → Check dashboard ID:1")


# Command to run:
# python manage.py shell < reset_grievances.py