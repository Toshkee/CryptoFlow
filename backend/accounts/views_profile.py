from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    username = request.data.get("username")
    email = request.data.get("email")

    if User.objects.exclude(id=user.id).filter(username=username).exists():
        return Response({"error": "Username already taken."}, status=400)

    if User.objects.exclude(id=user.id).filter(email=email).exists():
        return Response({"error": "Email already in use."}, status=400)

    user.username = username
    user.email = email
    user.save()

    return Response({
        "message": "Profile updated.",
        "user": {
            "username": user.username,
            "email": user.email
        }
    })
    

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user

    old_pw = request.data.get("old_password")
    new_pw = request.data.get("new_password")

    if not check_password(old_pw, user.password):
        return Response({"error": "Old password is incorrect."}, status=400)

    if len(new_pw) < 6:
        return Response({"error": "New password must be at least 6 characters."}, status=400)

    user.set_password(new_pw)
    user.save()

    return Response({"message": "Password updated successfully."})