-- CareOps AI - Healthcare Workflow Engine
-- Phase 1 Migration: Initial Relational Schema

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('STAFF', 'MANAGER', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('NONE', 'MANAGER', 'ADMINISTRATOR');

-- CreateTable
CREATE TABLE "calls" (
    "id" UUID NOT NULL,
    "patient_name" VARCHAR(255) NOT NULL,
    "patient_phone" VARCHAR(50) NOT NULL,
    "patient_mrn" VARCHAR(100),
    "transcript" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detected_intent" VARCHAR(100) NOT NULL,
    "priority" "Priority" NOT NULL,
    "sentiment" "Sentiment" NOT NULL,
    "call_timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "manager_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "department_id" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_tasks_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "call_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "department_id" VARCHAR(50) NOT NULL,
    "assigned_employee_id" UUID,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "escalation_level" "EscalationLevel" NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_notes" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "author_id" UUID,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_timelines" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "actor_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_deadline_at_idx" ON "tasks"("deadline_at");

-- CreateIndex
CREATE INDEX "tasks_call_id_idx" ON "tasks"("call_id");

-- CreateIndex
CREATE INDEX "tasks_department_id_idx" ON "tasks"("department_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_employee_id_idx" ON "tasks"("assigned_employee_id");

-- CreateIndex
CREATE INDEX "task_notes_task_id_idx" ON "task_notes"("task_id");

-- CreateIndex
CREATE INDEX "task_notes_author_id_idx" ON "task_notes"("author_id");

-- CreateIndex
CREATE INDEX "task_timelines_task_id_idx" ON "task_timelines"("task_id");

-- CreateIndex
CREATE INDEX "task_timelines_actor_id_idx" ON "task_timelines"("actor_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_timelines" ADD CONSTRAINT "task_timelines_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
