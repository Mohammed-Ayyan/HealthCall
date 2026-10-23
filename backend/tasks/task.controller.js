/**
 * CareOps AI - Task Controller Layer
 * 
 * HTTP request handlers for /api/v1/tasks.
 */

const taskService = require("./task.service");

async function createTask(req, res, next) {
  try {
    const task = await taskService.createTask({
      payload: req.body,
      requester: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

async function getTasks(req, res, next) {
  try {
    const { status, priority, department, assignedTo } = req.query;

    const tasks = await taskService.listTasks({
      requester: req.user,
      filters: {
        status,
        priority,
        department,
        assignedTo,
      },
    });

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

async function getTask(req, res, next) {
  try {
    const task = await taskService.getTaskById({
      id: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

async function assignTask(req, res, next) {
  try {
    const task = await taskService.assignTask({
      id: req.params.id,
      payload: req.body,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Task assigned successfully",
      task,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const task = await taskService.updateTaskStatus({
      id: req.params.id,
      payload: req.body,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      task,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    await taskService.deleteTask({
      id: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Task closed successfully",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

async function createTasksFromCall(req, res, next) {
  try {
    const tasks = await taskService.createTasksFromCall({
      callData: req.body,
      requester: req.user,
    });

    return res.status(201).json({
      success: true,
      message: `${tasks.length} task(s) processed and assigned from call`,
      tasks,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

module.exports = {
  createTask,
  createTasksFromCall,
  getTasks,
  getTask,
  assignTask,
  updateTaskStatus,
  deleteTask,
};
