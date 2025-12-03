from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import SignupSerializer, UserSerializer
from .models import Profile

import cloudinary.uploader


@api_view(["POST"])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"message": "Account created!"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["POST"])
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
    except:
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

    if len(new_pw) < 6:
        return Response({"error": "Password too short"}, status=400)

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