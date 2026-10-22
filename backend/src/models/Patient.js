const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: [true, 'Pharmacy reference is required'],
      index: true,
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID / MRN is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Unspecified'],
      default: 'Unspecified',
    },
    hospitalId: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    bloodGroup: {
      type: String,
      default: '',
    },
    allergies: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ pharmacy: 1, patientId: 1 }, { unique: true });
patientSchema.index({ pharmacy: 1, name: 'text', phone: 'text', hospitalId: 'text' });

module.exports = mongoose.model('Patient', patientSchema);
