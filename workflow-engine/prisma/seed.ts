import { PrismaClient, EmployeeRole, Priority, Sentiment, TaskStatus, EscalationLevel } from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic UUID constants for seed idempotency
const DEPARTMENT_IDS = {
  RECEPTION: "reception",
  INSURANCE: "insurance",
  CUSTOMER_SUPPORT: "customer_support",
  CLINICAL_TRIAGE: "clinical_triage",
} as const;

const SEED_EMPLOYEES = [
  // Reception Team
  {
    id: "e1000000-0000-0000-0000-000000000001",
    departmentId: DEPARTMENT_IDS.RECEPTION,
    fullName: "Chief Admin Amanda Collins",
    email: "amanda.collins@careops.hospital",
    role: EmployeeRole.ADMINISTRATOR,
    isActive: true,
    activeTasksCount: 0,
  },
  {
    id: "e1000000-0000-0000-0000-000000000002",
    departmentId: DEPARTMENT_IDS.RECEPTION,
    fullName: "Mark Hansen",
    email: "mark.hansen@careops.hospital",
    role: EmployeeRole.MANAGER,
    isActive: true,
    activeTasksCount: 1,
  },
  {
    id: "e1000000-0000-0000-0000-000000000003",
    departmentId: DEPARTMENT_IDS.RECEPTION,
    fullName: "Lisa Wong",
    email: "lisa.wong@careops.hospital",
    role: EmployeeRole.STAFF,
    isActive: true,
    activeTasksCount: 2,
  },

  // Insurance Department
  {
    id: "e2000000-0000-0000-0000-000000000001",
    departmentId: DEPARTMENT_IDS.INSURANCE,
    fullName: "Director Arthur Vance",
    email: "arthur.vance@careops.hospital",
    role: EmployeeRole.ADMINISTRATOR,
    isActive: true,
    activeTasksCount: 0,
  },
  {
    id: "e2000000-0000-0000-0000-000000000002",
    departmentId: DEPARTMENT_IDS.INSURANCE,
    fullName: "Michael Chang",
    email: "michael.chang@careops.hospital",
    role: EmployeeRole.MANAGER,
    isActive: true,
    activeTasksCount: 1,
  },
  {
    id: "e2000000-0000-0000-0000-000000000003",
    departmentId: DEPARTMENT_IDS.INSURANCE,
    fullName: "Emily Watson",
    email: "emily.watson@careops.hospital",
    role: EmployeeRole.STAFF,
    isActive: true,
    activeTasksCount: 3,
  },

  // Customer Support
  {
    id: "e3000000-0000-0000-0000-000000000001",
    departmentId: DEPARTMENT_IDS.CUSTOMER_SUPPORT,
    fullName: "Head of Operations Karen Taylor",
    email: "karen.taylor@careops.hospital",
    role: EmployeeRole.ADMINISTRATOR,
    isActive: true,
    activeTasksCount: 0,
  },
  {
    id: "e3000000-0000-0000-0000-000000000002",
    departmentId: DEPARTMENT_IDS.CUSTOMER_SUPPORT,
    fullName: "David Ross",
    email: "david.ross@careops.hospital",
    role: EmployeeRole.MANAGER,
    isActive: true,
    activeTasksCount: 1,
  },
  {
    id: "e3000000-0000-0000-0000-000000000003",
    departmentId: DEPARTMENT_IDS.CUSTOMER_SUPPORT,
    fullName: "Priya Sharma",
    email: "priya.sharma@careops.hospital",
    role: EmployeeRole.STAFF,
    isActive: true,
    activeTasksCount: 2,
  },

  // Clinical Triage
  {
    id: "e4000000-0000-0000-0000-000000000001",
    departmentId: DEPARTMENT_IDS.CLINICAL_TRIAGE,
    fullName: "Dr. Marcus Vance, Chief Medical Officer",
    email: "marcus.vance@careops.hospital",
    role: EmployeeRole.ADMINISTRATOR,
    isActive: true,
    activeTasksCount: 0,
  },
  {
    id: "e4000000-0000-0000-0000-000000000002",
    departmentId: DEPARTMENT_IDS.CLINICAL_TRIAGE,
    fullName: "Dr. Robert Chen, Lead Physician",
    email: "robert.chen@careops.hospital",
    role: EmployeeRole.MANAGER,
    isActive: true,
    activeTasksCount: 2,
  },
  {
    id: "e4000000-0000-0000-0000-000000000003",
    departmentId: DEPARTMENT_IDS.CLINICAL_TRIAGE,
    fullName: "Elena Rodriguez, RN",
    email: "elena.rodriguez@careops.hospital",
    role: EmployeeRole.STAFF,
    isActive: true,
    activeTasksCount: 4,
  },
];

const BASELINE_DEPARTMENTS = [
  {
    id: DEPARTMENT_IDS.RECEPTION,
    name: "Reception Team",
    managerId: "e1000000-0000-0000-0000-000000000002", // Mark Hansen
  },
  {
    id: DEPARTMENT_IDS.INSURANCE,
    name: "Insurance Department",
    managerId: "e2000000-0000-0000-0000-000000000002", // Michael Chang
  },
  {
    id: DEPARTMENT_IDS.CUSTOMER_SUPPORT,
    name: "Customer Support",
    managerId: "e3000000-0000-0000-0000-000000000002", // David Ross
  },
  {
    id: DEPARTMENT_IDS.CLINICAL_TRIAGE,
    name: "Clinical Triage",
    managerId: "e4000000-0000-0000-0000-000000000002", // Dr. Robert Chen
  },
];

async function seed() {
  console.log("🌱 Starting CareOps AI database seed...");

  // 1. Seed Departments (initially without managerId to avoid FK cycle before employees exist)
  console.log("📁 Seeding baseline departments...");
  for (const dept of BASELINE_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name },
      create: {
        id: dept.id,
        name: dept.name,
      },
    });
  }
  console.log(` Created ${BASELINE_DEPARTMENTS.length} baseline departments.`);

  // 2. Seed Employees with distinct roles (Staff, Manager, Administrator)
  console.log("👥 Seeding departmental employees...");
  for (const emp of SEED_EMPLOYEES) {
    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        fullName: emp.fullName,
        role: emp.role,
        departmentId: emp.departmentId,
        isActive: emp.isActive,
        activeTasksCount: emp.activeTasksCount,
      },
      create: {
        id: emp.id,
        fullName: emp.fullName,
        email: emp.email,
        role: emp.role,
        departmentId: emp.departmentId,
        isActive: emp.isActive,
        activeTasksCount: emp.activeTasksCount,
      },
    });
  }
  console.log(` Created/Updated ${SEED_EMPLOYEES.length} employees across all departments.`);

  // 3. Link Department Managers
  console.log("👔 Linking department managers...");
  for (const dept of BASELINE_DEPARTMENTS) {
    await prisma.department.update({
      where: { id: dept.id },
      data: { managerId: dept.managerId },
    });
  }
  console.log(" Linked managers to corresponding departments.");

  // 4. Seed Exemplar Clinical Call, Task, Note & Timeline for E2E Demonstration
  console.log("📞 Seeding exemplar clinical call and task...");
  const sampleCallId = "c1000000-0000-0000-0000-000000000001";
  const sampleTaskId = "a1000000-0000-0000-0000-000000000001";

  await prisma.call.upsert({
    where: { id: sampleCallId },
    update: {},
    create: {
      id: sampleCallId,
      patientName: "Eleanor Vance",
      patientPhone: "+1 (555) 234-5678",
      patientMrn: "MRN-849204",
      transcript:
        "Patient Eleanor Vance called reporting persistent post-operative pain and incision redness 4 days after abdominal laparoscopic surgery. Requesting urgent triage nurse assessment and prescription antibiotic review.",
      summary:
        "Post-op abdominal surgery patient reporting escalating localized pain and incision erythema. Urgent clinical review required.",
      detectedIntent: "POST_OP_COMPLICATION_TRIAGE",
      priority: Priority.URGENT,
      sentiment: Sentiment.CRITICAL,
      callTimestamp: new Date(),
    },
  });

  const triageDeadline = new Date(Date.now() + 1000 * 60 * 30); // 30-minute SLA

  await prisma.task.upsert({
    where: { id: sampleTaskId },
    update: {},
    create: {
      id: sampleTaskId,
      callId: sampleCallId,
      title: "Urgent Post-Op Wound Evaluation & Antibiotic Review",
      description:
        "Contact Eleanor Vance regarding post-laparoscopy surgical site erythema and elevated pain score. Review incision photos and coordinate with on-call attending.",
      departmentId: DEPARTMENT_IDS.CLINICAL_TRIAGE,
      assignedEmployeeId: "e4000000-0000-0000-0000-000000000003", // Elena Rodriguez, RN
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      escalationLevel: EscalationLevel.NONE,
      assignedAt: new Date(),
      deadlineAt: triageDeadline,
    },
  });

  // Task Note
  await prisma.taskNote.create({
    data: {
      id: "b1000000-0000-0000-0000-000000000001",
      taskId: sampleTaskId,
      authorId: "e4000000-0000-0000-0000-000000000003", // Elena Rodriguez
      note: "Left voicemail for patient Eleanor Vance. Escalating to attending surgeon Dr. Chen for fast-track telehealth appointment.",
    },
  }).catch(() => {
    // Ignore duplicate key if already seeded
  });

  // Task Timelines
  const timelines = [
    {
      id: "f1000000-0000-0000-0000-000000000001",
      taskId: sampleTaskId,
      eventType: "CALL_RECEIVED",
      message: "Inbound telephony call logged from +1 (555) 234-5678",
      metadata: { channel: "SIP_TRUNK", durationSeconds: 142 },
    },
    {
      id: "f1000000-0000-0000-0000-000000000002",
      taskId: sampleTaskId,
      eventType: "AI_PROCESSED",
      message: "NLU parser classified intent as POST_OP_COMPLICATION_TRIAGE with URGENT priority",
      metadata: { confidence: 0.982, sentiment: "CRITICAL" },
    },
    {
      id: "f1000000-0000-0000-0000-000000000003",
      taskId: sampleTaskId,
      actorId: "e4000000-0000-0000-0000-000000000002", // Dr. Robert Chen
      eventType: "ASSIGNED",
      message: "Task dispatched and assigned to Elena Rodriguez, RN",
      metadata: { department: "clinical_triage", priority: "URGENT" },
    },
  ];

  for (const tl of timelines) {
    await prisma.taskTimeline.create({
      data: tl,
    }).catch(() => {
      // Ignore duplicate key if already seeded
    });
  }

  console.log(" Seed completed successfully! All baseline entities ready.");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
