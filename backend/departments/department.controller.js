/**
 * CareOps AI - Department Controller Layer
 */

const departmentService = require("./department.service");
const { validateDepartmentCreate, validateDepartmentUpdate } = require("./department.validation");

class DepartmentController {
  async create(req, res, next) {
    try {
      const validation = validateDepartmentCreate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const department = await departmentService.createDepartment(req.body);
      return res.status(201).json({
        success: true,
        message: "Department created successfully",
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const departments = await departmentService.listDepartments(req.query);
      return res.status(200).json({
        success: true,
        count: departments.length,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      return res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const validation = validateDepartmentUpdate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const department = await departmentService.updateDepartment(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: "Department updated successfully",
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await departmentService.deleteDepartment(req.params.id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DepartmentController();
