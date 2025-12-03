from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

from .models import Profile


class SignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, data):
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError({"username": "Username already taken"})
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Email already registered"})
        return data

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        user = super().create(validated_data)

        # ensure profile is created
        Profile.objects.get_or_create(user=user)

        return user


class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile_picture"]

    def get_profile_picture(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)

        # if no picture exists
        if not profile.profile_picture:
            return None

        # image already a URL → return directly
        if profile.profile_picture.startswith("http"):
            return profile.profile_picture

        # fallback (should never be needed)
        return profile.profile_picture