import re
from rest_framework import serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_staff')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.CharField(write_only=True, required=False, default='SOC Analyst')

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'role')

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if not re.match(r'^[a-zA-Z0-9_.-]+$', value):
            raise serializers.ValidationError("Username can only contain alphanumeric characters, underscores, dots, or dashes.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already registered.")
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email address is required.")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return value.lower()

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        
        password = attrs.get('password')
        if not any(char.isdigit() for char in password):
            raise serializers.ValidationError({"password": "Password must contain at least one digit."})
        if not any(char.isalpha() for char in password):
            raise serializers.ValidationError({"password": "Password must contain at least one letter."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        role = validated_data.pop('role', 'SOC Analyst')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', role),
            last_name=validated_data.get('last_name', '')
        )
        return user
