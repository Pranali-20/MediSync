const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const getPatients = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const pharmacyId = req.pharmacyId;

    const query = { pharmacy: pharmacyId };
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { patientId: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { hospitalId: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return successResponse(res, {
      patients,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createPatient = async (req, res, next) => {
  try {
    const pharmacyId = req.pharmacyId;
    const {
      patientId,
      name,
      phone = '',
      dateOfBirth = null,
      age = null,
      gender = 'Unspecified',
      hospitalId = '',
      address = '',
      bloodGroup = '',
      allergies = [],
      emergencyContact = '',
    } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Patient name is required.', 400);
    }

    let finalPatientId = patientId ? patientId.trim() : '';
    if (!finalPatientId) {
      const count = await Patient.countDocuments({ pharmacy: pharmacyId });
      finalPatientId = 'PAT-' + String(count + 1001).padStart(4, '0');
    } else {
      const existing = await Patient.findOne({ pharmacy: pharmacyId, patientId: finalPatientId });
      if (existing) {
        return errorResponse(res, 'Patient with ID ' + finalPatientId + ' already exists in this pharmacy.', 400);
      }
    }

    const patient = await Patient.create({
      pharmacy: pharmacyId,
      patientId: finalPatientId,
      name: name.trim(),
      phone: phone.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      age: age ? Number(age) : null,
      gender,
      hospitalId: hospitalId.trim(),
      address: address.trim(),
      bloodGroup: bloodGroup.trim(),
      allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
      emergencyContact: emergencyContact.trim(),
    });

    return successResponse(res, patient, 'Patient registered successfully.', 201);
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, pharmacy: req.pharmacyId });
    if (!patient) {
      return errorResponse(res, 'Patient not found.', 404);
    }

    const prescriptions = await Prescription.find({
      pharmacy: req.pharmacyId,
      patient: patient._id,
    })
      .sort({ prescriptionDate: -1 })
      .populate('items.medicine', 'name genericName totalStock dosageForm strength');

    return successResponse(res, {
      patient,
      prescriptions,
    });
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, pharmacy: req.pharmacyId });
    if (!patient) {
      return errorResponse(res, 'Patient not found.', 404);
    }

    const {
      name,
      phone,
      dateOfBirth,
      age,
      gender,
      hospitalId,
      address,
      bloodGroup,
      allergies,
      emergencyContact,
    } = req.body;

    if (name !== undefined) patient.name = name.trim();
    if (phone !== undefined) patient.phone = phone.trim();
    if (dateOfBirth !== undefined) patient.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (age !== undefined) patient.age = age ? Number(age) : null;
    if (gender !== undefined) patient.gender = gender;
    if (hospitalId !== undefined) patient.hospitalId = hospitalId.trim();
    if (address !== undefined) patient.address = address.trim();
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup.trim();
    if (allergies !== undefined) patient.allergies = Array.isArray(allergies) ? allergies : [allergies];
    if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact.trim();

    await patient.save();

    return successResponse(res, patient, 'Patient details updated successfully.');
  } catch (error) {
    next(error);
  }
};

const deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, pharmacy: req.pharmacyId });
    if (!patient) {
      return errorResponse(res, 'Patient not found.', 404);
    }

    const activePrescriptions = await Prescription.countDocuments({
      pharmacy: req.pharmacyId,
      patient: patient._id,
      status: { $in: ['PENDING', 'PARTIALLY_DISPENSED'] },
    });

    if (activePrescriptions > 0) {
      return errorResponse(
        res,
        'Cannot delete patient with pending or partially dispensed prescriptions.',
        400
      );
    }

    await Patient.deleteOne({ _id: patient._id });
    return successResponse(res, null, 'Patient record removed successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatients,
  createPatient,
  getPatientById,
  updatePatient,
  deletePatient,
};
