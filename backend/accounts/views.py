from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import SignupSerializer, UserSerializer
from .models import Profile

import cloudinary.uploader


@api_view(["POST"])
@throttle_classes([ScopedRateThrottle])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"message": "Account created!"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["POST"])
@throttle_classes([ScopedRateThrottle])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid login."}, status=400)

    refresh = RefreshToken.for_user(user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data
    })


# ScopedRateThrottle reads `throttle_scope` off the view. @api_view wraps each
# function in a generated APIView subclass reachable via `.cls`, so we attach
# the scope there. Rates live in REST_FRAMEWORK.DEFAULT_THROTTLE_RATES.
# These tight per-IP limits blunt credential-stuffing / signup abuse.
login.cls.throttle_scope = "login"
signup.cls.throttle_scope = "signup"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    refresh = request.data.get("refresh")
    try:
        RefreshToken(refresh).blacklist()
    except Exception:
        return Response({"error": "Invalid token"}, status=400)

    return Response({"message": "Logged out"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    username = request.data.get("username")
    email = request.data.get("email")

    if not username or not email:
        return Response({"error": "Both fields required"}, status=400)

    if User.objects.exclude(id=user.id).filter(username=username).exists():
        return Response({"error": "Username taken"}, status=400)

    if User.objects.exclude(id=user.id).filter(email=email).exists():
        return Response({"error": "Email already used"}, status=400)

    user.username = username
    user.email = email
    user.save()

    return Response({
        "message": "Profile updated",
        "user": UserSerializer(user).data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_pw = request.data.get("old_password")
    new_pw = request.data.get("new_password")

    if not check_password(old_pw, user.password):
        return Response({"error": "Incorrect old password"}, status=400)

    # Enforce the full AUTH_PASSWORD_VALIDATORS suite instead of a naive
    # len < 6 check, and surface failures as a clean DRF 400.
    try:
        validate_password(new_pw, user)
    except DjangoValidationError as exc:
        return Response({"error": exc.messages}, status=400)

    user.set_password(new_pw)
    user.save()

    return Response({"message": "Password updated"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    if "image" not in request.FILES:
        return Response({"error": "No image provided"}, status=400)

    upload = cloudinary.uploader.upload(request.FILES["image"])
    image_url = upload.get("secure_url")

    profile, _ = Profile.objects.get_or_create(user=request.user)
    profile.profile_picture = image_url
    profile.save()

    return Response({
        "message": "Picture uploaded",
        "user": UserSerializer(request.user).data
    })