# **📦 Project Specification: StoreMind**

**Project Name:** StoreMind
**Developer:** Phongsin (PJ) Jirapipattanaporn
**Status:** Alpha Development (In-Progress)
**Target Industry:** Retail, Supply Chain, and Logistics (Australia)

---

## **1. Project Objective**
To build an integrated retail management ecosystem that harmonizes **Demand Forecasting** with **Dynamic Workforce Optimization**. By leveraging Machine Learning and autonomous AI Agents, the system ensures optimal in-store operations, maintains critical service standards through smart task prioritization, and minimizes labor costs by intelligently re-allocating on-site resources during disruptions.

---

## **2. Business Use Case & Pain Points**
Major retailers like Uniqlo Australia face significant operational challenges:
1. **Inventory Inefficiency:** Inaccurate stocking leads to missed sales opportunities or capital tied up in overstock.
2. **Operational Fragility:** Unplanned absences (sick leave) leave critical stations empty, requiring manual rescheduling or expensive emergency cover.
3. **Scheduling Friction:** High administrative overhead for coordinating shift swaps and matching staff skills with real-time store requirements.

---

## **3. Functional Requirements**

### **3.1 Daily Work Schedule (DWS) Generation**
The system must automatically generate a DWS time table for each operational day based on staff skill sets and the following constraints:
* **Shift Duration:** Each staff member works a **9–10 hour shift**.
* **Break Policy:** Each shift includes **two breaks** totaling **1 hour and 30 minutes**.
* **The 4-Hour Rule:** Staff cannot work more than **4 consecutive hours** without a break (AI target is 3 to 3.5 hours).
* **Task Rotation:** Staff members are rotated across different tasks during the day to ensure operational flexibility; they are not allowed to do the same task all day.

### **3.2 Task Definitions & Minimum Requirements**

| Task Code | Task Name | Description | Minimum Staffing Requirements |
| :--- | :--- | :--- | :--- |
| **SF (A-D)** | Sale Floor | Tiding, folding, and customer service in zones A, B, C, and D. | **1 per zone** (4 total) at all times. |
| **CSH** | Cashier | Processing transactions for customers. | **1 staff** at all times. |
| **SCO** | Self Check-Out | Assisting customers at kiosks; assists Cashier if needed. | 1 if busy; not required if quiet. |
| **FR (1-3)** | Fitting Room | Managing lines, assisting customers, folding returns. | **1 mandatory**; 2 preferred; 3 if very busy. |
| **RN** | Runner | Returning items to floor; running items from replenishment. | 1 mandatory; 2 if busy. |
| **RP** | Replenishment | Unpacking and restocking from the stockroom. | 1–2 based on daily priority. |
| **ALT** | Alteration | Performing alterations for pants. | **1 staff** at all times (re-assigned if no pending items). |

### **3.3 AI Reschedule Agent (Autonomous Absence Management)**
Upon a sick leave notification, the AI Agent follows an **"Internal Re-allocation First"** logic:
1. **Gap Assessment:** Identifies the missing staff's assigned task and priority level.
2. **Dynamic DWS Regeneration:** Automatically recalculates the DWS for all on-site staff to cover critical gaps by shifting staff from lower-priority tasks.
3. **Break Optimization:** Adjusts break timings to maintain maximum floor coverage during the disruption.

---

## **4. Store Operations Hours**
The AI generator uses these hours as the operational "Active" window:
* **Monday–Wednesday:** 09:00 – 17:30
* **Thursday–Friday:** 09:00 – 21:00
* **Saturday:** 09:30 – 17:00
* **Sunday:** 10:00 – 17:00

---

## **5. Technical Stack**
* **Frontend:** ReactJS, Tailwind CSS, Chart.js (Operational Dashboard).
* **Backend:** Node.js, Express.js.
* **AI/ML Service:** Python (Scikit-Learn, Pandas, FastAPI).
* **Agent Logic:** LangChain or Custom Logic for constraint-based decision making.
* **Database:** MySQL (Relational Schema).
* **DevOps:** Docker, Kubernetes (Minikube), GitHub Actions.

---

## **6. Updated Database Schema**

### **6.1 Workforce & Skills**
* **employees**: `id, name, type (FT/PT), availability_mask`
* **skills**: `id, skill_name` (e.g., Cashier, Fitting Room, Alteration)
* **employee_skills**: `employee_id, skill_id, proficiency_level`

### **6.2 Tasks & Daily Requirements**
* **tasks**: `id, task_code (SF_A, FR1, etc.), task_name, priority_level, required_skill_id`
* **daily_requirements**: `id, date, event_type, targeted_task_id, min_staff_required`

### **6.3 Shifts & DWS (The Scheduler)**
* **shifts**: `id, employee_id, date, start_time, end_time, total_hours, status (Active/Sick/Swap_Requested)`
* **dws_assignments**: `id, shift_id, task_id, slot_start_time, slot_end_time`
* **breaks**: `id, shift_id, break_start, break_end, break_type (e.g., 1 hour or 30 min)`

---

## **7. Development Roadmap**
1. **Week 1-2:** Core Demand Forecaster & Relational Database Setup.
2. **Week 3-4:** Employee Skill Matrix & Digital Shift Rosters.
3. **Month 2-3:** **AI Reschedule Agent & DWS Implementation** (Logic for task rotation, break compliance, and re-allocation).
4. **Future Scope:** Weather API Integration and Mobile-first Employee Portal.
