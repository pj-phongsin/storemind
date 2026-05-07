# **📦 Project Specification: StoreMind**

**Project Name:** StoreMind

**Developer:** Phongsin (PJ) Jirapipattanaporn

**Status:** Alpha Development (In-Progress)

**Target Industry:** Retail, Supply Chain, and Logistics (Australia)

## **1\. Project Objective**

To build an integrated retail management ecosystem that harmonizes **Demand Forecasting** with **Dynamic Workforce Optimization**. By leveraging Machine Learning and autonomous AI Agents, the system ensures optimal in-store operations, maintains critical service standards through smart task prioritization, and minimizes labor costs by intelligently re-allocating on-site resources during disruptions.

## **2\. Business Use Case & Pain Points**

Major retailers like Uniqlo Australia face significant operational challenges:

1. **Inventory Inefficiency:** Inaccurate stocking leads to missed sales opportunities or capital tied up in overstock.  
2. **Operational Fragility:** Unplanned absences (sick leave) leave critical stations (e.g., Cashier, Fitting Room) empty, requiring managers to spend hours manually rescheduling or calling in expensive emergency cover.  
3. **Scheduling Friction:** High administrative overhead for coordinating shift swaps and matching staff skills with real-time store requirements (e.g., Delivery days vs. High-traffic days).

## **3\. Functional Requirements**

### **3.1 Smart Demand Forecasting**

* **Sales Analytics:** Daily sales tracking and trend analysis categorized by product lines (e.g., AIRism, Heattech).  
* **Weather-Driven Insights:** (Future Roadmap) Integration with OpenWeatherMap API to adjust inventory based on Melbourne’s volatile weather patterns (e.g., prioritizing winter-wear stock when temperatures drop).

### **3.2 Dynamic Task Prioritization**

The AI engine categorizes and allocates staff based on real-time operational needs:

* **P1 (Critical):** Cashier (POS), Sales Floor Service, Fitting Room (Must be manned to ensure customer experience).  
* **P2 (Supporting):** Stock Room Replenishment, Online Order Fulfillment.  
* **P3 (Flexible):** Folding, Tidying, General Cleaning (Lower priority; can be paused during peak hours).  
* **Event-Driven Logic:** On **Restock Days**, AI shifts more resources to P2. On **High Traffic Days**, resources are moved to P1.

### **3.3 AI Reschedule Agent (Autonomous Absence Management)**

Upon a sick leave notification, the AI Agent follows an **"Internal Re-allocation First"** cost-optimized logic:

1. **Gap Assessment:** Identifies the missing staff's assigned task and its priority level.  
2. **Intelligent Re-allocation:** Scans on-site staff for matching skills and automatically moves an individual from a **P3 (Flexible Priority)** task (e.g., Folding) to cover the critical P1 gap (e.g., Cashier).  
3. **Optimized Roster Restructuring:** Automatically shifts break times and secondary tasks of the remaining team to maintain maximum floor coverage.  
4. **Last Resort Escalation:** Triggers the "Shift Swap Marketplace" or "Emergency Call-in" ONLY if internal re-allocation cannot satisfy minimum service requirements.

### **3.4 P2P Shift Swap Marketplace**

* Employees can request shift changes via a mobile interface.  
* AI notifies eligible peers (matched by skills and available hours) to accept the swap autonomously, removing the manager from the manual coordination process.

## **4\. Technical Stack**

* **Frontend:** ReactJS, Tailwind CSS, Chart.js (Operational Dashboard).  
* **Backend:** Node.js, Express.js.  
* **AI/ML Service:** Python (Scikit-Learn, Pandas, FastAPI).  
* **Agent Logic:** LangChain or Custom Logic for constraint-based decision making.  
* **Database:** MySQL (Relational Schema).  
* **DevOps:** Docker, Kubernetes (Minikube), GitHub Actions.

## **5\. Database Schema**

### **5.1 Inventory & Sales**

* **products**: id, name, sku, category, unit\_price  
* **inventory**: product\_id, quantity\_on\_hand, reorder\_point  
* **sales**: id, product\_id, quantity\_sold, total\_amount, sale\_date

### **5.2 Workforce & Skills**

* **employees**: id, name, type (FT/PT), availability\_mask  
* **skills**: id, skill\_name (e.g., Cashier, Fitting Room, Folding)  
* **employee\_skills**: employee\_id, skill\_id, proficiency\_level

### **5.3 Tasks & Shifts**

* **tasks**: id, task\_name, priority\_level (1-5), required\_skill\_id  
* **daily\_requirements**: date, event\_type (Delivery/Sale), targeted\_task\_id  
* **shifts**: id, employee\_id, start\_time, end\_time, current\_task\_id, status (Active/Sick/Swap\_Requested)

## **6\. Development Roadmap**

1. **Week 1-2:** Core Demand Forecaster & Relational Database Setup (Core MVP).  
2. **Week 3-4:** Employee Skill Matrix & Digital Shift Rosters.  
3. **Month 2-3:** **AI Reschedule Agent Implementation** (Constraint-based logic for task priority & re-allocation).  
4. **Future Scope:** Weather API Integration and Mobile-first Employee Portal for real-time task notifications.