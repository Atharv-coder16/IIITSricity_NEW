from fastapi import APIRouter, Request
from backend.state import app_state
from datetime import datetime
import random

router = APIRouter()

@router.get("/metrics")
def get_metrics():
    if len(app_state.metrics) == 0:
        return [{"time": "00:00", "detected": 0, "dark": 0, "high_threat": 0}]
    return app_state.metrics

@router.get("/alerts")
def get_alerts():
    alerts = []
    for i, a in enumerate(app_state.alerts):
        alerts.append({
            "id": f"ALT-{str(i+1).zfill(3)}",
            "type": a.get("level", "MEDIUM"),
            "severity": a.get("level", "MEDIUM"),
            "message": a.get("message", ""),
            "time": a.get("time_str", ""),
            "location": f"{18.7 + random.random()*0.5:.2f}°N, {72.7 + random.random()*0.3:.2f}°E",
            "track": "Unknown",
            "vessel": f"VESSEL-{str(random.randint(1,14)).zfill(3)}",
            "alert_type": a.get("message", "").split("—")[0].strip() if "—" in a.get("message", "") else "Detection Alert",
            "reason": a.get("message", "Automated surveillance trigger — anomaly detected by NEPTUNE-AI pattern analysis engine."),
        })
    return alerts

@router.delete("/alerts")
def clear_alerts():
    app_state.alerts.clear()
    return {"status": "ok", "message": "All alerts cleared"}

@router.get("/detections")
def get_detections():
    return {
        "image_size": app_state.last_image_size,
        "detections": app_state.detections
    }

@router.get("/dashboard_stats")
def get_dashboard_stats():
    total_detected = len(app_state.detections)
    dark_vessels = sum(1 for d in app_state.detections if d.get("is_dark_vessel"))
    high_threat = sum(1 for d in app_state.detections if d.get("threat_level") == "HIGH")
    return {
        "total": total_detected,
        "dark": dark_vessels,
        "high_threat": high_threat,
        "system_load": f"{min(95, 30 + app_state.scan_count * 5)}%",
        "accuracy": 94,
        "vessel_count": len(app_state.vessels),
        "scan_count": app_state.scan_count,
        "uptime": app_state.get_uptime(),
    }

# ====== VESSELS (Live Tracking) ======
@router.get("/vessels")
def get_vessels():
    app_state.update_vessels()
    return {"vessels": app_state.vessels, "count": len(app_state.vessels)}

# ====== ANALYTICS ======
@router.get("/analytics/data")
def get_analytics_data(range: str = "7D"):
    return app_state.get_analytics(range)

# ====== RISK SCORING ======
@router.get("/risk/vessels")
def get_risk_vessels():
    vessels = app_state.vessels
    return {
        "vessels": vessels,
        "counts": {
            "dangerous": sum(1 for v in vessels if v["level"] == "DANGEROUS"),
            "suspicious": sum(1 for v in vessels if v["level"] == "SUSPICIOUS"),
            "safe": sum(1 for v in vessels if v["level"] == "SAFE"),
        }
    }

# ====== USERS ======
@router.get("/users")
def get_users():
    return {"users": app_state.users}

@router.post("/users")
async def add_user(request: Request):
    data = await request.json()
    new_user = {
        "id": len(app_state.users) + 1,
        "name": data.get("name", "New User"),
        "email": data.get("email", ""),
        "role": data.get("role", "Viewer"),
        "status": "Active",
        "lastLogin": "Never",
        "initials": "".join(w[0] for w in data.get("name", "NU").split()[:2]).upper(),
        "color": ["#00e5ff", "#7b2ff7", "#00ff88", "#ffcc00"][random.randint(0, 3)],
    }
    app_state.users.append(new_user)
    return new_user

@router.put("/users/{user_id}/toggle")
def toggle_user(user_id: int):
    for u in app_state.users:
        if u["id"] == user_id:
            u["status"] = "Inactive" if u["status"] == "Active" else "Active"
            return u
    return {"error": "User not found"}

# ====== SETTINGS ======
@router.get("/settings")
def get_settings():
    return app_state.settings

@router.put("/settings")
async def update_settings(request: Request):
    data = await request.json()
    app_state.settings.update(data)
    return {"status": "ok", "settings": app_state.settings}

# ====== TIME MACHINE ======
@router.get("/timemachine")
def get_timemachine():
    """Return vessel position history from all SAR scans + current live positions."""
    history = app_state.detection_history  # list of scan snapshots

    # Build position trail per vessel across all scan snapshots
    vessel_map = {}
    scan_times = []
    for snap in history:
        scan_times.append(snap["time"])
        for v in snap["vessels"]:
            vid = v["id"]
            if vid not in vessel_map:
                vessel_map[vid] = {
                    "id": vid,
                    "status": v["status"],
                    "type": v.get("type", "Unknown"),
                    "positions": [],
                }
            vessel_map[vid]["positions"].append({"x": v["x"], "y": v["y"]})
            vessel_map[vid]["status"] = v["status"]

    # Append CURRENT live positions (after update_vessels moved them)
    app_state.update_vessels()
    for v in app_state.vessels:
        vid = v["id"]
        if vid not in vessel_map:
            vessel_map[vid] = {
                "id": vid,
                "status": v["status"],
                "type": v.get("type", "Unknown"),
                "positions": [],
            }
        vessel_map[vid]["positions"].append({"x": v["x"], "y": v["y"]})
        vessel_map[vid]["status"] = v["status"]
        vessel_map[vid]["type"] = v.get("type", "Unknown")

    # Pad each vessel's trail to exactly 12 frames
    for vid in vessel_map:
        pos = vessel_map[vid]["positions"]
        if len(pos) == 0:
            pos = [{"x": 0.5, "y": 0.5}]
        while len(pos) < 12:
            pos.append(pos[-1])
        vessel_map[vid]["positions"] = pos[:12]

    events = []
    for i, a in enumerate(app_state.alerts[-8:]):
        events.append({
            "time": min(11, i + 1),
            "label": a.get("message", "Event")[:55],
            "severity": a.get("level", "MEDIUM"),
        })

    return {
        "vessels": list(vessel_map.values()),
        "events": events,
        "scan_count": len(history),
        "scan_times": scan_times[-12:],
        "current_vessels": len(app_state.vessels),
    }

# ====== CHAT / AI ASSISTANT ======
@router.get("/chat/history")
def get_chat_history():
    return app_state.chat_history

@router.post("/chat/send")
async def send_chat(request: Request):
    data = await request.json()
    msg = data.get("message", "")
    app_state.chat_history.append({"from": "user", "text": msg})
    
    # Generate contextual response from real state
    total = len(app_state.detections)
    dark = sum(1 for d in app_state.detections if d.get("is_dark_vessel"))
    vessel_count = len(app_state.vessels)
    dangerous = sum(1 for v in app_state.vessels if v["level"] == "DANGEROUS")
    
    lower = msg.lower()
    if "dark" in lower or "vessel" in lower:
        response = f"Current surveillance data: {vessel_count} vessels tracked, {dark} confirmed dark contacts. {dangerous} vessels classified as DANGEROUS. {'Recommend immediate investigation.' if dangerous > 0 else 'All clear.'}"
    elif "risk" in lower or "threat" in lower:
        avg_risk = sum(v["risk"] for v in app_state.vessels) / max(len(app_state.vessels), 1)
        response = f"Current threat assessment: Average risk score is {avg_risk:.0f}/100. {dangerous} vessels at DANGEROUS level. System has completed {app_state.scan_count} SAR scans this session."
    elif "zone" in lower or "alpha" in lower:
        zones = {}
        for v in app_state.vessels:
            zones[v["zone"]] = zones.get(v["zone"], 0) + 1
        zone_str = ", ".join(f"{k}: {v} vessels" for k, v in zones.items())
        response = f"Zone distribution: {zone_str}. Total vessels: {vessel_count}."
    elif "detect" in lower or "sar" in lower or "scan" in lower:
        response = f"SAR Detection status: {app_state.scan_count} scans completed. Last scan found {total} vessels with {dark} dark contacts. Model: YOLOv8-Nano, confidence threshold: {app_state.settings['confidence']}%."
    elif "report" in lower:
        response = f"Report data: {total} total detections, {dark} dark vessels, {len(app_state.alerts)} alerts logged, {len(app_state.report_history)} reports generated this session. Navigate to Reports to generate a PDF."
    else:
        response = f"NEPTUNE-AI status: {vessel_count} vessels tracked, {app_state.scan_count} scans completed, {len(app_state.alerts)} alerts active, system uptime: {app_state.get_uptime()}. How can I assist further?"
    
    app_state.chat_history.append({"from": "ai", "text": response})
    return {"response": response}

@router.delete("/chat")
def clear_chat():
    app_state.chat_history.clear()
    return {"status": "ok"}

# ====== REPORTS HISTORY ======
@router.get("/reports/history")
def get_report_history():
    return app_state.report_history

@router.post("/reports/generate")
async def generate_report(request: Request):
    data = await request.json()
    report = {
        "id": f"RPT-{str(len(app_state.report_history) + 1).zfill(4)}",
        "date": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "type": data.get("type", "Full Surveillance"),
        "zones": ", ".join(data.get("zones", ["All"])),
        "total_ships": len(app_state.detections),
        "dark_vessels": sum(1 for d in app_state.detections if d.get("is_dark_vessel")),
        "alerts": len(app_state.alerts),
    }
    app_state.report_history.insert(0, report)
    if len(app_state.report_history) > 10:
        app_state.report_history = app_state.report_history[:10]
    return report

from fastapi import Response
from fastapi.responses import PlainTextResponse
from fpdf import FPDF
from datetime import datetime
import json
import csv
import io

class PDFReport(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 18)
        self.set_text_color(0, 51, 102)
        self.cell(0, 10, "SAR Maritime Intelligence System", border=False, ln=True, align="C")
        self.set_font("helvetica", "I", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", border=False, ln=True, align="C")
        self.line(10, 30, 200, 30)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128)
        self.cell(0, 10, f"Page {self.page_no()} - CONFIDENTIAL restricted intelligence document", align="C")

@router.get("/reports/daily")
def get_daily_summary():
    total_detected = len(app_state.detections)
    dark_vessels = sum(1 for d in app_state.detections if d.get("is_dark_vessel"))
    high_threat = sum(1 for d in app_state.detections if d.get("threat_level") == "HIGH")
    
    pdf = PDFReport()
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "Daily Executive Summary - Last 24 Hours", ln=True)
    pdf.ln(5)
    
    # Key Metrics
    pdf.set_font("helvetica", "B", 12)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(0, 10, "  1. High-Level Metrics", ln=True, fill=True)
    pdf.set_font("helvetica", "", 12)
    pdf.ln(2)
    pdf.cell(0, 8, f"Total Vessel Detections: {total_detected}", ln=True)
    pdf.cell(0, 8, f"Confirmed Dark Vessels: {dark_vessels}", ln=True)
    pdf.cell(0, 8, f"High Threat Alerts: {high_threat}", ln=True)
    pdf.cell(0, 8, f"Active Fleet Formations tracked: {len(app_state.fleets)}", ln=True)
    pdf.ln(10)
    
    # Recent Alerts
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "  2. Recent Critical Alerts", ln=True, fill=True)
    pdf.set_font("helvetica", "", 10)
    pdf.ln(2)
    for alert in app_state.alerts[-15:]:
        pdf.set_text_color(200, 0, 0) if alert.get("level") == "HIGH" else pdf.set_text_color(0)
        
        # Sanitize message to prevent FPDF UnicodeEncodeError from emojis (🔴)
        raw_msg = alert.get('message', '')
        safe_msg = raw_msg.encode('latin-1', 'ignore').decode('latin-1')
        time_str = str(alert.get('time_str', ''))[:19]
        lvl = str(alert.get('level', 'INFO'))
        
        pdf.cell(0, 6, f"[{time_str}] {lvl}: {safe_msg}", ln=True)
    
    pdf_bytes = bytes(pdf.output())
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=daily_executive_summary.pdf"})


@router.get("/reports/raw", response_class=PlainTextResponse)
def get_raw_logs():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Track_ID", "Confidence", "Threat_Score", "Threat_Level", "Is_Dark_Vessel", "Ship_Type", "BBox_X1", "BBox_Y1", "BBox_X2", "BBox_Y2"])
    for d in app_state.detections:
        bbox = d.get("bbox", [0,0,0,0])
        writer.writerow([d.get("track_id", -1), f"{d.get('confidence', 0):.4f}", f"{d.get('threat_score', 0):.1f}", d.get("threat_level", "LOW"), str(d.get("is_dark_vessel", False)), d.get("ship_type", "Unknown"), int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])])
    return PlainTextResponse(content=output.getvalue(), media_type="text/csv")


@router.get("/reports/threats")
def get_threat_logs():
    try:
        pdf = PDFReport()
        pdf.add_page()
        
        pdf.set_font("helvetica", "B", 16)
        pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 10, "Incident & Threat Log", ln=True)
        pdf.ln(5)
        
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(50, 50, 50)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(40, 8, "Timestamp", border=1, fill=True)
        pdf.cell(30, 8, "Severity", border=1, fill=True)
        pdf.cell(120, 8, "Incident Details", border=1, fill=True, ln=True)
        
        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(0, 0, 0)
        
        for a in reversed(app_state.alerts):
            lvl = str(a.get("level", "LOW"))
            raw_msg = str(a.get("message", "Unknown incident"))
            
            # Sanitize to prevent FPDF crashing on emojis (🔴)
            safe_msg = raw_msg.encode('latin-1', 'ignore').decode('latin-1')
            
            # Truncate to fit on one line for a neat table
            if len(safe_msg) > 75:
                safe_msg = safe_msg[:72] + "..."
                
            time_str = str(a.get("time_str", ""))[:19]
            
            pdf.cell(40, 8, time_str, border=1)
            pdf.cell(30, 8, lvl, border=1)
            pdf.cell(120, 8, safe_msg, border=1, ln=True)
            
        if len(app_state.alerts) == 0:
            pdf.cell(190, 8, "No active alerts or zone violations recorded.", border=1, align="C", ln=True)
            
        pdf_bytes = bytes(pdf.output())
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=incident_threat_log.pdf"})
    except Exception as e:
        import traceback
        return PlainTextResponse(status_code=500, content=traceback.format_exc())
