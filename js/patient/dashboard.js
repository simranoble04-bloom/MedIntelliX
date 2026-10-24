
/* =========================================
   MedIntelliX — Patient Dashboard
   File: js/patient/dashboard.js

   DEMO ONLY:
   All statistics and profile details below
   are fictional sample data.
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {
    initializeDashboardYear();
    initializePatientProfile();
    initializeDashboardStatistics();
});

/* ---------- Footer Year ---------- */

function initializeDashboardYear() {
    const yearElement = document.getElementById("dashboardYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/* ---------- Patient Profile ---------- */

function initializePatientProfile() {
    /*
     * Fictional demo profile.
     * Replace with authenticated API data
     * after the backend is implemented.
     */

    const demoPatient = {
        name: "Alex Morgan"
    };

    const patientNameElement = document.getElementById("patientName");
    const welcomeNameElement = document.getElementById("welcomeName");
    const initialsElement = document.getElementById("profileInitials");

    if (patientNameElement) {
        patientNameElement.textContent = demoPatient.name;
    }

    if (welcomeNameElement) {
        welcomeNameElement.textContent = getFirstName(demoPatient.name);
    }

    if (initialsElement) {
        initialsElement.textContent = getInitials(demoPatient.name);
    }
}

function getFirstName(fullName) {
    const cleanedName = fullName.trim();

    if (!cleanedName) {
        return "there";
    }

    return cleanedName.split(/\s+/)[0];
}

function getInitials(fullName) {
    const cleanedName = fullName.trim();

    if (!cleanedName) {
        return "MD";
    }

    return cleanedName
        .split(/\s+/)
        .slice(0, 2)
        .map(function (part) {
            return part.charAt(0).toUpperCase();
        })
        .join("");
}

/* ---------- Dashboard Statistics ---------- */

async function initializeDashboardStatistics() {
    // These statistics remain demo values until their APIs exist.
    updateStatistic("reportsCount", 4);
    updateStatistic("medicationsCount", 2);
    updateStatistic("appointmentsCount", 1);

    // Fetch the patient count from the backend.
    try {
        const response = await fetch(
            "http://localhost:3000/api/patients/count"
        );

        if (!response.ok) {
            throw new Error("Unable to fetch patient count.");
        }

        const data = await response.json();

        if (
            data.success !== true ||
            !Number.isInteger(data.totalPatients) ||
            data.totalPatients < 0
        ) {
            throw new Error("Invalid patient count response.");
        }

        updateStatistic("recordsCount", data.totalPatients);

    } catch (error) {
        console.error("Dashboard records count failed:", error);

        // Do not display a fake database count when the API fails.
        updateStatistic("recordsCount", "Unavailable");
    }
}

function updateStatistic(elementId, value) {
    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent = String(value);
}
