from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from grievance_api.models import Grievance

class Command(BaseCommand):
    help = 'Auto-escalate SLA overdue grievances'
    
    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=1)  # Daily check
        
        # 🔥 TRIAGE 7d → TopAuth
        triage_overdue = Grievance.objects.filter(
            status='In Review', 
            due_date__lte=cutoff
        )
        for g in triage_overdue:
            g.status = 'Pending Approval'
            g.save()
            self.stdout.write(
                self.style.WARNING(f"TRIAGE→TOPAUTH: {g.id} {g.title}")
            )
        
        # 🔥 DEPT 7d → Policy Decision
        dept_overdue = Grievance.objects.filter(
            status='In Progress', 
            due_date__lte=cutoff
        )
        for g in dept_overdue:
            g.status = 'Policy Decision'
            g.save()
            self.stdout.write(
                self.style.ERROR(f"DEPT→POLICY: {g.id} {g.title}")
            )
        
        total = triage_overdue.count() + dept_overdue.count()
        self.stdout.write(
            self.style.SUCCESS(f'🚀 Escalated {total} grievances')
        )
