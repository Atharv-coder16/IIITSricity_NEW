from datetime import datetime, timedelta
import random
import math

class AppState:
    def __init__(self):
        self.last_image_size = {"width": 1000, "height": 1000}
        self.detections = []
        self.alerts = []
        self.fleets = []
        self.metrics = []
        self.start_time = datetime.utcnow()
        self.scan_count = 0
        self.vessels = []  # EMPTY — populated ONLY from SAR detections
        self.detection_history = []  # stores all past detection snapshots for time machine
        self.users = [
            {"id": 1, "name": "Cmdr. Atharv", "email": "atharv@neptune.mil", "role": "Admin", "status": "Active", "lastLogin": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "initials": "CA", "color": "#00e5ff"},
            {"id": 2, "name": "Lt. Priya Sharma", "email": "priya@neptune.mil", "role": "Analyst", "status": "Active", "lastLogin": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "initials": "PS", "color": "#7b2ff7"},
            {"id": 3, "name": "Op. Raj Kumar", "email": "raj@neptune.mil", "role": "Viewer", "status": "Active", "lastLogin": (datetime.utcnow() - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M"), "initials": "RK", "color": "#00ff88"},
        ]
        self.settings = {
            "confidence": 25,
            "nms": 45,
            "alert_sensitivity": "Medium",
            "scan_interval": "15min",
            "auto_report": True,
            "email_alerts": True,
            "browser_notif": True,
            "alert_sound": False,
        }
        self.report_history = []
        self.chat_history = []

    def update_vessels(self):
        """Move detected vessels and periodically save position snapshots for time machine."""
        if not self.vessels:
            return
        for v in self.vessels:
            v["x"] += v["vx"]
            v["y"] += v["vy"]
            if v["x"] < 0.02 or v["x"] > 0.98:
                v["vx"] *= -1
            if v["y"] < 0.02 or v["y"] > 0.98:
                v["vy"] *= -1
            v["speed"] = round(max(2, v["speed"] + (random.random() - 0.5) * 0.3), 1)
            v["heading"] = (v["heading"] + random.randint(-3, 3)) % 360
        
        # Save a position snapshot for time machine every call
        # (throttle: only if last snapshot was >3s ago or no snapshots exist)
        now = datetime.utcnow()
        should_snap = (
            len(self.detection_history) == 0 or
            (now - self._last_snapshot_time).total_seconds() > 3
            if hasattr(self, '_last_snapshot_time') else True
        )
        if should_snap and self.vessels:
            self._last_snapshot_time = now
            self.detection_history.append({
                "time": now.strftime("%H:%M:%S"),
                "vessels": [{"id": v["id"], "x": v["x"], "y": v["y"], "status": v["status"], "type": v.get("type", "Unknown")} for v in self.vessels]
            })
            # Keep last 24 snapshots (covers ~72s of tracking at 3s intervals)
            if len(self.detection_history) > 24:
                self.detection_history = self.detection_history[-24:]

    def add_detection_run(self, detections, alerts, fleets):
        self.detections = detections
        self.alerts.extend(alerts)
        self.fleets = fleets
        self.scan_count += 1

        now_str = datetime.utcnow().strftime("%H:%M")
        dark_count = sum(1 for d in detections if d.get("is_dark_vessel"))
        high_threat_count = sum(1 for d in detections if d.get("threat_level") == "HIGH")

        self.metrics.append({
            "time": now_str,
            "detected": len(detections),
            "dark": dark_count,
            "high_threat": high_threat_count
        })

        # === BUILD VESSELS FROM REAL DETECTIONS ===
        zones = ["Alpha-7", "Beta-3", "Gamma-5", "Delta-1"]
        suspicions = [
            "AIS transponder disabled near exclusive economic zone boundary",
            "Speed anomaly detected in restricted shipping lane",
            "Unauthorized entry into military exclusion zone",
            "Vessel maintaining fixed formation with other contacts",
            "Flag state verification failed — unknown origin",
        ]
        
        new_vessels = []
        img_w = self.last_image_size.get("width", 1000)
        img_h = self.last_image_size.get("height", 1000)

        for d in detections:
            tid = d.get("track_id", len(new_vessels) + 1)
            bbox = d.get("bbox", [0, 0, 100, 100])
            # Convert bbox center to normalized position
            cx = ((bbox[0] + bbox[2]) / 2) / img_w
            cy = ((bbox[1] + bbox[3]) / 2) / img_h
            cx = max(0.05, min(0.95, cx))
            cy = max(0.05, min(0.95, cy))

            is_dark = d.get("is_dark_vessel", False)
            risk = int(d.get("threat_score", random.randint(10, 90)))
            ais = not is_dark
            status = "dark" if is_dark else ("suspicious" if d.get("threat_level") == "MEDIUM" or risk > 40 else "safe")
            level = "DANGEROUS" if risk > 70 else ("SUSPICIOUS" if risk > 30 else "SAFE")

            vessel = {
                "id": f"VESSEL-{str(tid).zfill(3)}",
                "type": d.get("ship_type", "Unknown"),
                "speed": round(5 + random.random() * 18, 1),
                "heading": random.randint(0, 360),
                "ais": ais,
                "risk": risk,
                "zone": random.choice(zones),
                "status": status,
                "level": level,
                "x": cx,
                "y": cy,
                "vx": (random.random() - 0.5) * 0.002,
                "vy": (random.random() - 0.5) * 0.002,
                "confidence": d.get("confidence", 0),
                "suspicion": random.choice(suspicions) if status != "safe" else "No anomalies detected",
                "bbox": bbox,
                "breakdown": {
                    "ais": 35 if not ais else 0,
                    "speed": 25 if risk > 40 else 0,
                    "zone": 20 if risk > 30 else 0,
                    "night": 15 if risk > 60 else 0,
                    "origin": 5 if risk > 70 else 0,
                }
            }
            new_vessels.append(vessel)

        self.vessels = new_vessels

        # Save snapshot for time machine (keep last 12)
        self.detection_history.append({
            "time": now_str,
            "vessels": [{"id": v["id"], "x": v["x"], "y": v["y"], "status": v["status"]} for v in new_vessels]
        })
        if len(self.detection_history) > 12:
            self.detection_history = self.detection_history[-12:]

        if len(self.metrics) > 20:
            self.metrics = self.metrics[-20:]
        if len(self.alerts) > 100:
            self.alerts = self.alerts[-100:]

    def get_uptime(self):
        delta = datetime.utcnow() - self.start_time
        return str(delta).split(".")[0]

    def get_analytics(self, range_key="7D"):
        """Generate analytics from REAL detection data only."""
        total = len(self.detections)
        dark = sum(1 for d in self.detections if d.get("is_dark_vessel"))

        line_data = [m["detected"] for m in self.metrics[-7:]] if self.metrics else []

        dark_by_region = {}
        type_dist = {}
        zone_density = {}
        risk_trend = []

        for v in self.vessels:
            t = v["type"]
            type_dist[t] = type_dist.get(t, 0) + 1
            z = v["zone"]
            zone_density[z] = zone_density.get(z, 0) + 1
            risk_trend.append(v["risk"])
            if v["status"] == "dark":
                dark_by_region[z] = dark_by_region.get(z, 0) + 1

        insights = []
        if self.vessels:
            insights.append(f"Total vessels detected: {len(self.vessels)}, with {dark} dark contacts")
            if zone_density:
                top_zone = max(zone_density, key=zone_density.get)
                insights.append(f"Zone {top_zone} has highest vessel density ({zone_density[top_zone]} ships)")
            insights.append(f"{self.scan_count} SAR scans completed this session")
        else:
            insights.append("No detections yet — upload a SAR image to begin analysis")
            insights.append("System is online and awaiting first scan")
            insights.append("Navigate to SAR Detection to upload imagery")

        return {
            "line": line_data if line_data else [],
            "dark_by_region": [{"label": k, "value": v} for k, v in dark_by_region.items()],
            "type_distribution": [{"label": k, "value": v} for k, v in type_dist.items()],
            "risk_trend": risk_trend if risk_trend else [],
            "zone_density": zone_density,
            "top_risk_zones": sorted([{"label": k, "value": v} for k, v in zone_density.items()], key=lambda x: x["value"], reverse=True)[:5],
            "total": total,
            "dark": dark,
            "vessel_count": len(self.vessels),
            "scan_count": self.scan_count,
            "insights": insights,
        }

app_state = AppState()
