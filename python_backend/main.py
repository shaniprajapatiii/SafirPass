from fastapi import FastAPI
from pydantic import BaseModel
import math

app = FastAPI(title="SafirPass AI Backend")

# App se Data receive karne ke liye format
class LocationData(BaseModel):
    user_lat: float
    user_lon: float
    safe_lat: float = 28.7041  # Default Safe Zone (Example: Delhi)
    safe_lon: float = 77.1025
    radius_km: float = 2.0     # 2 KM ka radius

# Geo-fencing ka Core Logic (Haversine Formula)
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth's radius in km
    dlon = math.radians(lon2 - lon1)
    dlat = math.radians(lat2 - lat1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# 1. GEO-FENCING API
@app.post("/check-geofence")
def check_location(data: LocationData):
    dist = calculate_distance(data.user_lat, data.user_lon, data.safe_lat, data.safe_lon)
    
    if dist > data.radius_km:
        return {"status": "ALERT", "distance_km": round(dist, 2), "message": "User Safe Zone se bahar hai! Alerting Authorities."}
    return {"status": "SAFE", "distance_km": round(dist, 2), "message": "User zone ke andar hai."}

# 2. SOS API
@app.post("/trigger-sos")
def trigger_sos():
    # Abhi ke liye sirf dummy SMS terminal me print kar rahe hain. 
    # PPT ke hisaab se baad me yahan Twilio/Fast2SMS ki API key lagayenge!
    print("🚨 SOS TRIGGERED! Sending exact GPS coordinates to Police and Contacts... 🚨")
    return {"status": "SUCCESS", "message": "SOS Alerts sent successfully!"}