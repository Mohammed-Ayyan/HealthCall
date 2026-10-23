/**
 * CareOps AI - Appointment Controller Layer
 * 
 * HTTP request handlers for /api/v1/appointments.
 */

const appointmentService = require("./appointment.service");

async function createAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.createAppointment({
      payload: req.body,
      requester: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment,
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

async function getAppointments(req, res, next) {
  try {
    const { doctorName, date, status } = req.query;

    const appointments = await appointmentService.listAppointments({
      requester: req.user,
      doctorName,
      date,
      status,
    });

    return res.status(200).json({
      success: true,
      appointments,
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

async function updateAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.updateAppointment({
      id: req.params.id,
      updates: req.body,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      appointment,
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

async function deleteAppointment(req, res, next) {
  try {
    await appointmentService.deleteAppointment({
      id: req.params.id,
      requester: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
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
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
};
