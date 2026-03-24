from fastapi import APIRouter
from backend.state import app_state

router = APIRouter()

@router.get("/metrics")
def get_metrics():
    # Return time-series metrics populated across detection events
    if len(app_state.metrics) == 0:
        return [
            { "time": "00:00", "detected": 0, "dark": 0, "high_threat": 0 }
        ]
    return app_state.metrics

@router.get("/alerts")
def get_alerts():
    # The alerts from the latest run, or all accumulated alerts (simplified format for frontend)
    alerts = []
    for i, a in enumerate(app_state.alerts):
        alerts.append({
            "id": i,
            "type": a.get("level", "MEDIUM"),
            "message": a.get("message", ""),
            "time": a.get("time_str", ""),
            "location": "Map Area", # Can extract from bbox centroid if desired
            "track": "Unknown" 
        })
    return alerts

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
        "system_load": "42%" # mock standard
    }

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
