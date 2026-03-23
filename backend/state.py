from datetime import datetime

class AppState:
    def __init__(self):
        self.last_image_size = {"width": 1000, "height": 1000}
        self.detections = []
        self.alerts = []
        self.fleets = []
        self.metrics = []

    def add_detection_run(self, detections, alerts, fleets):
        self.detections = detections
        self.alerts = alerts
        self.fleets = fleets
        
        now_str = datetime.now().strftime("%H:%M")
        dark_count = sum(1 for d in detections if d.get("is_dark_vessel"))
        high_threat_count = sum(1 for d in detections if d.get("threat_level") == "HIGH")
        
        self.metrics.append({
            "time": now_str,
            "detected": len(detections),
            "dark": dark_count,
            "high_threat": high_threat_count
        })
        
        # Keep last 20 runs
        if len(self.metrics) > 20:
            self.metrics = self.metrics[-20:]

app_state = AppState()
