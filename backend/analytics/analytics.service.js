/**
 * CareOps AI - Healthcare Operations Analytics Service
 * 
 * Computes live operational analytics and real-time intelligence directly from MongoDB:
 * - Patient populations and department distributions
 * - Clinical workforce, roles, and credential status
 * - Workflow engine task completion rates and department workloads
 * - Insurance claim adjudication queues
 */

const User = require("../models/User");
const Patient = require("../models/Patient");
const Task = require("../models/Task");
const InsuranceClaim = require("../models/InsuranceClaim");
const Appointment = require("../models/Appointment");
const Department = require("../models/Department");
const { USER_ROLES } = require("../config/roles");

class AnalyticsService {
  /**
   * 1. Overview Analytics
   * GET /api/v1/analytics/overview
   */
  async getOverview() {
    const [
      totalPatients,
      totalUsers,
      activeDoctors,
      pendingTasks,
      completedTasks,
      claimsPending,
    ] = await Promise.all([
      Patient.countDocuments({}),
      User.countDocuments({ status: { $ne: "DELETED" } }),
      User.countDocuments({ role: USER_ROLES.DOCTOR, status: "ACTIVE" }),
      Task.countDocuments({
        status: {
          $in: ["CREATED", "ASSIGNED", "IN_PROGRESS", "PENDING", "OPEN", "created", "assigned", "in_progress"],
        },
      }),
      Task.countDocuments({
        status: {
          $in: ["COMPLETED", "RESOLVED", "CLOSED", "completed", "resolved", "closed"],
        },
      }),
      InsuranceClaim.countDocuments({
        status: { $in: ["SUBMITTED", "UNDER_REVIEW"] },
      }),
    ]);

    return {
      totalPatients,
      totalUsers,
      activeDoctors,
      pendingTasks,
      completedTasks,
      claimsPending,
    };
  }

  /**
   * 2. Task Analytics
   * GET /api/v1/analytics/tasks
   */
  async getTaskAnalytics() {
    const [pendingTasks, completedTasks, totalTasks] = await Promise.all([
      Task.countDocuments({
        status: {
          $in: ["CREATED", "ASSIGNED", "IN_PROGRESS", "PENDING", "OPEN", "created", "assigned", "in_progress"],
        },
      }),
      Task.countDocuments({
        status: {
          $in: ["COMPLETED", "RESOLVED", "CLOSED", "completed", "resolved", "closed"],
        },
      }),
      Task.countDocuments({}),
    ]);

    const completionRate =
      totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 100;

    // Aggregate department workload from Task collection
    const rawDeptWorkload = await Task.aggregate([
      {
        $group: {
          _id: "$department",
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["CREATED", "ASSIGNED", "IN_PROGRESS", "PENDING", "OPEN", "created", "assigned", "in_progress"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["COMPLETED", "RESOLVED", "CLOSED", "completed", "resolved", "closed"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Ensure all standard hospital departments are represented
    const defaultDepts = ["RECEPTION", "CLINICAL", "INSURANCE", "ADMINISTRATION"];
    const deptMap = new Map();

    defaultDepts.forEach((dept) => {
      deptMap.set(dept, {
        department: dept,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        workloadShare: 0,
      });
    });

    rawDeptWorkload.forEach((item) => {
      const deptName = item._id ? String(item._id).toUpperCase() : "GENERAL";
      deptMap.set(deptName, {
        department: deptName,
        totalTasks: item.total,
        pendingTasks: item.pending,
        completedTasks: item.completed,
        workloadShare: totalTasks > 0 ? Number(((item.total / totalTasks) * 100).toFixed(1)) : 0,
      });
    });

    const departmentWorkload = Array.from(deptMap.values());

    return {
      completionRate,
      pendingTasks,
      completedTasks,
      totalTasks,
      departmentWorkload,
    };
  }

  /**
   * 3. Patient Analytics
   * GET /api/v1/analytics/patients
   */
  async getPatientAnalytics() {
    const patientCount = await Patient.countDocuments({});

    // Aggregate department distribution
    const rawDistribution = await Patient.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$department", "General & Primary Care"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const departmentDistribution = rawDistribution.map((item) => ({
      department: item._id === "" ? "General & Primary Care" : item._id,
      count: item.count,
      percentage:
        patientCount > 0 ? Number(((item.count / patientCount) * 100).toFixed(1)) : 0,
    }));

    return {
      patientCount,
      departmentDistribution,
    };
  }

  /**
   * 4. User Analytics
   * GET /api/v1/analytics/users
   */
  async getUserAnalytics() {
    const [activeUsers, inactiveUsers, totalUsers, rolesAgg] = await Promise.all([
      User.countDocuments({ status: "ACTIVE" }),
      User.countDocuments({ status: { $in: ["INACTIVE", "SUSPENDED"] } }),
      User.countDocuments({ status: { $ne: "DELETED" } }),
      User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const usersByRole = {};
    Object.values(USER_ROLES).forEach((role) => {
      usersByRole[role] = 0;
    });

    rolesAgg.forEach((item) => {
      if (item._id) {
        usersByRole[item._id] = item.count;
      }
    });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
    };
  }
}

module.exports = new AnalyticsService();
