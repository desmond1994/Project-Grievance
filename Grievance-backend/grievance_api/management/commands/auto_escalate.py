from django.core.management.base import BaseCommand
from datetime import date
from grievance_api.models import Grievance

class Command(BaseCommand):
    help = 'Auto-escalate SLA overdue grievances'
    
    def handle(self, *args, **options):
        today = date.today()
        self.stdout.write(f"🔍 Today: {today}")
        
        # Find ALL overdue - simple Python logic
        triage_all = Grievance.objects.filter(status='In Review')
        triage_overdue = [g for g in triage_all if g.due_date and g.due_date.date() < today]
        self.stdout.write(f"🔍 Triage total: {triage_all.count()}, overdue: {len(triage_overdue)}")
        
        for g in triage_overdue:
            old_status = g.status
            g.status = 'Pending Approval'
            g.save()
            self.stdout.write(self.style.WARNING(f"✅ {old_status}→Pending Approval: {g.id} {g.title}"))
        
        dept_all = Grievance.objects.filter(status='In Progress')
        dept_overdue = [g for g in dept_all if g.due_date and g.due_date < today]
        self.stdout.write(f"🔍 Dept total: {dept_all.count()}, overdue: {len(dept_overdue)}")
        
        for g in dept_overdue:
            old_status = g.status
            g.status = 'Policy Decision'
            g.save()
            self.stdout.write(self.style.ERROR(f"✅ {old_status}→Policy Decision: {g.id} {g.title}"))
        
        total = len(triage_overdue) + len(dept_overdue)
        self.stdout.write(self.style.SUCCESS(f'🚀 Escalated {total} grievances'))
