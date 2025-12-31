from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to allow only users who are superusers or belong to admin groups.
    """
    def has_permission(self, request, view):
        # Check that user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Check superuser or membership in designated admin groups
        admin_groups = ['Super Administrator', 'Triage Officer', 'Department Head']
        is_admin = (
            request.user.is_superuser or
            request.user.groups.filter(name__in=admin_groups).exists()
        )

        return is_admin
