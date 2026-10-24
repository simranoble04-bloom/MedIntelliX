const pool = require("./config/database");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(
    cors({
        origin: [
            "http://127.0.0.1:5500",
            "http://localhost:5500"
        ]
    })
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "MedIntelliX backend is running!",
        service: "MedIntelliX API",
        status: "healthy"
    });
});
app.get("/api/health/db", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            success: true,
            service: "MedIntelliX Database",
            status: "connected"
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);

        res.status(503).json({
            success: false,
            service: "MedIntelliX Database",
            status: "unavailable",
            message: "Database connection unavailable"
        });
    }
});
app.get("/api/patients/count", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*)::int AS total FROM patients"
        );

        res.status(200).json({
            success: true,
            totalPatients: result.rows[0].total
        });
    } catch (error) {
        console.error("Patient count query failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve patient count."
        });
    }
});
// Get the patient list for the hospital portal.
app.get("/api/hospital/patients", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                patient_code,
                full_name,
                date_of_birth,
                created_at
            FROM patients
            ORDER BY created_at DESC
        `);

        const patients = result.rows.map((patient) => {
            let age = null;

            if (patient.date_of_birth) {
                const today = new Date();
                const birthDate = new Date(patient.date_of_birth);

                age = today.getFullYear() - birthDate.getFullYear();

                const birthdayNotReached =
                    today.getMonth() < birthDate.getMonth() ||
                    (
                        today.getMonth() === birthDate.getMonth() &&
                        today.getDate() < birthDate.getDate()
                    );

                if (birthdayNotReached) {
                    age--;
                }
            }

            return {
                id: patient.patient_code,
                name: patient.full_name,
                age,
                enrolledOn: patient.created_at
            };
        });

        res.status(200).json({
            success: true,
            total: patients.length,
            patients
        });
    } catch (error) {
        console.error("Hospital patient list query failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve the hospital patient list."
        });
    }
});

// Update a consultation's status.
app.patch(
    "/api/hospital/consultations/:consultationCode/status",
    async (req, res) => {
        try {
            const allowedStatuses = [
                "scheduled",
                "in-progress",
                "completed",
                "cancelled",
                "no-show"
            ];

            const { status } = req.body;
            const { consultationCode } = req.params;

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid consultation status."
                });
            }

            const result = await pool.query(
                `UPDATE consultations
                 SET status = $1
                 WHERE consultation_code = $2
                 RETURNING consultation_code, status`,
                [status, consultationCode]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Consultation not found."
                });
            }

            return res.json({
                success: true,
                consultation: result.rows[0]
            });
        } catch (error) {
            console.error("Consultation status update failed:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to update consultation status."
            });
        }
    }
);

// Get all consultations with their linked patient details.
app.get("/api/hospital/consultations", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                c.consultation_code,
                p.patient_code,
                p.full_name,
                c.doctor_name,
                c.consultation_date,
                c.consultation_time,
                c.consultation_type,
                c.department,
                c.duration_minutes,
                c.status,
                c.notes
            FROM consultations c
            JOIN patients p ON p.id = c.patient_id
            ORDER BY c.consultation_date, c.consultation_time
        `);

        return res.json({
            success: true,
            consultations: result.rows
        });
    } catch (error) {
        console.error("Consultations fetch failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to load consultations."
        });
    }
});

app.get("/api/hospital/reports", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                mr.report_code,
                p.patient_code,
                p.full_name,
                mr.report_type,
                mr.doctor_name,
                mr.report_date,
                mr.status,
                mr.notes
            FROM medical_reports mr
            JOIN patients p ON p.id = mr.patient_id
            ORDER BY mr.report_date DESC, mr.id DESC
        `);

        res.json({
            success: true,
            reports: result.rows
        });
    } catch (error) {
        console.error("Error fetching medical reports:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch medical reports."
        });
    }
});

app.patch(
    "/api/hospital/reports/:reportCode/status",
    async (req, res) => {
        const { reportCode } = req.params;
        const { status } = req.body;

        const allowedStatuses = ["pending", "reviewed", "archived"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid report status."
            });
        }

        try {
            const result = await pool.query(
                `UPDATE medical_reports
                 SET status = $1
                 WHERE report_code = $2
                 RETURNING report_code, status`,
                [status, reportCode]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Report not found."
                });
            }

            res.json({
                success: true,
                report: result.rows[0]
            });
        } catch (error) {
            console.error("Error updating report status:", error.message);
            res.status(500).json({
                success: false,
                message: "Unable to update report status."
            });
        }
    }
);

// Register a new demonstration patient.
app.post("/api/hospital/patients", async (req, res) => {
    try {
        const { patientCode, fullName, dateOfBirth } = req.body;

        if (
            typeof patientCode !== "string" ||
            typeof fullName !== "string" ||
            typeof dateOfBirth !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Patient code, full name, and date of birth are required."
            });
        }

        const code = patientCode.trim();
        const name = fullName.trim();

        if (
            !/^[A-Za-z0-9-]{3,30}$/.test(code) ||
            name.length < 2 ||
            name.length > 100 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid patient details."
            });
        }

        const parsedDate = new Date(`${dateOfBirth}T00:00:00Z`);
        const today = new Date().toISOString().slice(0, 10);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== dateOfBirth ||
            dateOfBirth > today
        ) {
            return res.status(400).json({
                success: false,
                message: "Date of birth must be a valid date that is not in the future."
            });
        }

        const result = await pool.query(
            `INSERT INTO patients (patient_code, full_name, date_of_birth)
             VALUES ($1, $2, $3)
             RETURNING patient_code, full_name, date_of_birth, created_at`,
            [code, name, dateOfBirth]
        );

        const patient = result.rows[0];

        return res.status(201).json({
            success: true,
            message: "Patient registered successfully.",
            patient: {
                id: patient.patient_code,
                name: patient.full_name,
                dateOfBirth: patient.date_of_birth,
                enrolledOn: patient.created_at
            }
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "That patient code already exists."
            });
        }

        console.error("Patient registration failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to register patient."
        });
    }
});

app.get("/api/patients/:patientCode/records", async (req, res) => {
    try {
        const { patientCode } = req.params;

        const result = await pool.query(
            `SELECT
                p.patient_code,
                p.full_name,
                h.record_type,
                h.description,
                h.recorded_at
             FROM patients AS p
             LEFT JOIN health_records AS h
                ON h.patient_id = p.id
             WHERE p.patient_code = $1
             ORDER BY h.recorded_at DESC`,
            [patientCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient not found."
            });
        }

        res.status(200).json({
            success: true,
            patient: {
                patientCode: result.rows[0].patient_code,
                fullName: result.rows[0].full_name
            },
            records: result.rows.map(row => ({
                recordType: row.record_type,
                description: row.description,
                recordedAt: row.recorded_at
            }))
        });
    } catch (error) {
        console.error("Patient record query failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve patient records."
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

app.listen(PORT, () => {
    console.log(`MedIntelliX API running at http://localhost:${PORT}`);
});