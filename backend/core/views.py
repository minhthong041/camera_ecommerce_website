from django.shortcuts import render
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Create your views here.

@api_view(["GET"])
def health_check(request):
    return Response(
        {
            "status": "ok",
            "service": "camera-ecommerce-api",
            "timestamp": timezone.now().isoformat(),
        }
    )