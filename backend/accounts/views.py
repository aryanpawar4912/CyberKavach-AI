from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import UserSerializer, RegisterSerializer
from audit.models import AuditLog

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.ALLOW_PUBLIC_REGISTRATION:
            return Response(
                {'detail': 'Public registration is disabled. Contact an administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        # Audit log registration
        AuditLog.objects.create(
            actor=user.username,
            action=f"User registered with role {user.first_name or 'SOC Analyst'}",
            object_id=f"User-{user.id}",
            outcome='success'
        )

        return Response({
            'message': 'Account created successfully.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response({'detail': 'Both username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if not user:
            AuditLog.objects.create(
                actor=username or 'unknown',
                action='Failed login attempt',
                outcome='failure'
            )
            return Response({'detail': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'This account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)

        AuditLog.objects.create(
            actor=user.username,
            action='User logged in',
            object_id=f"User-{user.id}",
            outcome='success'
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({'message': 'Logged out successfully.'})

class MeView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        return Response({'detail': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
