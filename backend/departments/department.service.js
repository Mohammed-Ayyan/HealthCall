/**
 * CareOps AI - Department Service Layer
 * 
 * Implements business logic and MongoDB operations for hospital departments.
 */

const Department = require("../models/Department");
const User = require("../models/User");
const Task = require("../models/Task");

class DepartmentService {
  /**
   * Create a new hospital department
   */
  async createDepartment(data) {
    const existing = await Department.findOne({
      name: { $regex: new RegExp(`^${data.name.trim()}$`, "i") },
    });

    if (existing) {
      const error = new Error(`Department with name '${data.name}' already exists`);
      error.statusCode = 409;
      throw error;
    }

    if (data.managerId) {
      const manager = await User.findById(data.managerId);
      if (!manager) {
        const error = new Error("Assigned manager not found");
        error.statusCode = 404;
        throw error;
      }
    }

    const department = new Department({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : "",
      managerId: data.managerId || null,
      status: data.status ? String(data.status).toUpperCase() : "ACTIVE",
    });

    await department.save();
    return await this.getDepartmentById(department._id);
  }

  /**
   * List all departments with operational staff and task metrics
   */
  async listDepartments(query = {}) {
    const filter = {};
    if (query.status) {
      filter.status = String(query.status).toUpperCase();
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
      ];
    }

    const departments = await Department.find(filter)
      .populate("managerId", "name email role")
      .sort({ name: 1 })
      .lean();

    // Augment with live user staff counts and active tasks count
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const staffCount = await User.countDocuments({
          department: { $regex: new RegExp(`^${dept.name}$`, "i") },
          status: { $ne: "INACTIVE" },
        });

        const openCommitmentsCount = await Task.countDocuments({
          department: { $regex: new RegExp(dept.name, "i") },
          status: { $in: ["PENDING", "IN_PROGRESS", "OPEN", "pending", "in_progress"] },
        });

        // Compute workload score based on commitments
        const baseWorkload = 70;
        const currentWorkloadScore = Math.min(100, baseWorkload + openCommitmentsCount * 4);

        return {
          id: dept._id.toString(),
          _id: dept._id.toString(),
          name: dept.name,
          description: dept.description || "",
          managerId: dept.managerId ? dept.managerId._id.toString() : null,
          leadName: dept.managerId ? dept.managerId.name : "Unassigned Lead",
          status: dept.status,
          staffCount,
          openCommitmentsCount,
          currentWorkloadScore,
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt,
        };
      })
    );

    return enriched;
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id) {
    const dept = await Department.findById(id).populate("managerId", "name email role").lean();
    if (!dept) {
      const error = new Error("Department not found");
      error.statusCode = 404;
      throw error;
    }

    const staffCount = await User.countDocuments({
      department: { $regex: new RegExp(`^${dept.name}$`, "i") },
      status: { $ne: "INACTIVE" },
    });

    const openCommitmentsCount = await Task.countDocuments({
      department: { $regex: new RegExp(dept.name, "i") },
      status: { $in: ["PENDING", "IN_PROGRESS", "OPEN", "pending", "in_progress"] },
    });

    return {
      id: dept._id.toString(),
      _id: dept._id.toString(),
      name: dept.name,
      description: dept.description || "",
      managerId: dept.managerId ? dept.managerId._id.toString() : null,
      leadName: dept.managerId ? dept.managerId.name : "Unassigned Lead",
      status: dept.status,
      staffCount,
      openCommitmentsCount,
      currentWorkloadScore: Math.min(100, 70 + openCommitmentsCount * 4),
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    };
  }

  /**
   * Update department
   */
  async updateDepartment(id, updates) {
    const dept = await Department.findById(id);
    if (!dept) {
      const error = new Error("Department not found");
      error.statusCode = 404;
      throw error;
    }

    if (updates.name && updates.name.trim().toLowerCase() !== dept.name.toLowerCase()) {
      const existing = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${updates.name.trim()}$`, "i") },
      });
      if (existing) {
        const error = new Error(`Department with name '${updates.name}' already exists`);
        error.statusCode = 409;
        throw error;
      }
      dept.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      dept.description = updates.description.trim();
    }

    if (updates.managerId !== undefined) {
      if (updates.managerId) {
        const manager = await User.findById(updates.managerId);
        if (!manager) {
          const error = new Error("Assigned manager not found");
          error.statusCode = 404;
          throw error;
        }
        dept.managerId = updates.managerId;
      } else {
        dept.managerId = null;
      }
    }

    if (updates.status !== undefined) {
      dept.status = String(updates.status).toUpperCase();
    }

    await dept.save();
    return await this.getDepartmentById(dept._id);
  }

  /**
   * Delete department
   */
  async deleteDepartment(id) {
    const dept = await Department.findById(id);
    if (!dept) {
      const error = new Error("Department not found");
      error.statusCode = 404;
      throw error;
    }

    await Department.findByIdAndDelete(id);

    return {
      success: true,
      message: `Department '${dept.name}' deleted successfully`,
    };
  }
}

module.exports = new DepartmentService();
