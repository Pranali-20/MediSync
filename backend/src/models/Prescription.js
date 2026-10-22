const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: [true, 'Medicine is required'],
  },
  medicineName: {
    type: String,
    required: true,
  },
  dosageInstructions: {
    type: String,
    default: '',
  },
  quantityPrescribed: {
    type: Number,
    required: [true, 'Prescribed quantity is required'],
    min: 1,
  },
  quantityDispensed: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const dispensingRecordSchema = new mongoose.Schema({
  dispensedAt: {
    type: Date,
    default: Date.now,
  },
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dispensedByName: {
    type: String,
    default: 'Pharmacist',
  },
  items: [
    {
      medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
      },
      medicineName: String,
      batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
      },
      batchNumber: String,
      quantity: Number,
    },
  ],
  notes: String,
});

const prescriptionSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    prescriptionNumber: {
      type: String,
      required: [true, 'Prescription number is required'],
      trim: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    department: {
      type: String,
      default: 'General Medicine',
      trim: true,
    },
    prescriptionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    items: [prescriptionItemSchema],
    notes: {
      type: String,
      default: '',
    },
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dispensedByName: {
      type: String,
      default: '',
    },
    dispensedAt: {
      type: Date,
      default: null,
    },
    dispensingHistory: [dispensingRecordSchema],
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.index({ pharmacy: 1, prescriptionNumber: 1 }, { unique: true });
prescriptionSchema.index({ pharmacy: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
