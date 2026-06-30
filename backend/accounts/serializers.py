from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import (
    validate_password as django_validate_password,
)
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Profile
from futures.models import FuturesWallet   # ⭐ ADD THIS


class SignupSerializer(serializers.ModelSerializer):
    """ Handles user registration + auto profile + auto futures wallet """

    class Meta:
        model = User
        fields = ["username", "email", "password"]
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True},
        }

    def validate_password(self, value):
        # Run Django's configured AUTH_PASSWORD_VALIDATORS (length, common
        # passwords, numeric-only, similarity to username/email). Signup
        # previously bypassed these entirely. A throwaway unsaved User gives
        # the similarity validator something to compare against.
        user = User(
            username=self.initial_data.get("username", ""),
            email=self.initial_data.get("email", ""),
        )
        try:
            django_validate_password(value, user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, data):
        # username exists?
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError({
                "username": "Username already taken"
            })

        # email exists?
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({
                "email": "Email already registered"
            })

        return data

    def create(self, validated_data):
        # hash password
        validated_data["password"] = make_password(validated_data["password"])
        user = super().create(validated_data)

        # create profile
        Profile.objects.get_or_create(user=user)

        # ⭐ create a futures wallet automatically
        FuturesWallet.objects.get_or_create(user=user)

        return user



class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile_picture"]

    def get_profile_picture(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)

        if not profile.profile_picture:
          return None

        # If image is already an absolute URL (Cloudinary)
        if profile.profile_picture.startswith("http"):
            return profile.profile_picture
        
        # fallback — normally never used
        return profile.profile_picture