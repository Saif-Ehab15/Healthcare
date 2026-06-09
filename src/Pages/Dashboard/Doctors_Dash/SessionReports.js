import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  ClipboardList,
  Calendar,
  Clock,
  Pill,
  Save,
  X,
  History,
  Pencil
} from 'lucide-react';
import axiosInstance from '../../../Config/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SessionReports.css';

function SessionReports() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const doctorId = user.id || null;

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getImageUrl = (image, name) => {
    if (image) {
      if (image.startsWith('http')) return image;
      if (image.startsWith('data:image')) return image;
      return image.startsWith('/')
        ? `https://localhost:7250${image}`
        : `https://localhost:7250/images/${image}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Unknown')}&background=0D9488&color=fff&size=128`;
  };

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);

  const [reportData, setReportData] = useState({
    diagnosis: '',
    medications: [''],
    notes: ''
  });

  // ===== Fetch reservations for the selected date =====
  useEffect(() => {
    const fetchReservationsByDate = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/api/Reservation/doctor/${doctorId}/date/${selectedDate}`);
        setPatients(response.data);
      } catch (err) {
        setError('Failed to fetch patients for the selected date.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (doctorId && selectedDate) {
      fetchReservationsByDate();
    } else {
      setLoading(false);
    }
  }, [doctorId, selectedDate]);

  // ===== Fetch patient history =====
  const viewHistory = async (patient) => {
    setSelectedPatient({ ...patient, history: [] });
    setShowHistory(true);
    try {
      const response = await axiosInstance.get(`/api/ReportDoctorToPatient/patient/${patient.patientId}`);
      setSelectedPatient({ ...patient, history: response.data });
    } catch (err) {
      console.error(err);
      setSelectedPatient({ ...patient, history: [] });
    }
  };

  const closeReportModal = () => {
    setShowReport(false);
    setEditingReportId(null);
    setReportData({ diagnosis: '', medications: [''], notes: '' });
  };

  // ===== Open report modal =====
  const openReport = (patient) => {
    setSelectedPatient(patient);
    setEditingReportId(null);
    setShowReport(true);
    setReportData({
      diagnosis: '',
      medications: [''],
      notes: ''
    });
  };

  const openEditReport = (patient, record) => {
    const reportId = record.id ?? record.Id;
    const medicines = record.medicines ?? record.Medicines ?? [];

    setSelectedPatient(patient);
    setEditingReportId(reportId);
    setShowReport(true);
    setReportData({
      diagnosis: '',
      medications: medicines.length > 0 ? medicines : [''],
      notes: record.report ?? record.Report ?? ''
    });
  };

  const refreshPatientHistory = async (patient) => {
    try {
      const response = await axiosInstance.get(
        `/api/ReportDoctorToPatient/patient/${patient.patientId}`
      );
      setSelectedPatient({ ...patient, history: response.data });
    } catch (err) {
      console.error(err);
    }
  };

  // ===== Save report =====
  const saveReport = async () => {
    if (!selectedPatient) return;

    const medicines = reportData.medications.filter((m) => m.trim() !== '');
    const reportText = reportData.notes.trim();

    if (!reportText) {
      toast.error('Please write the report before saving.');
      return;
    }

    try {
      if (editingReportId) {
        await axiosInstance.put(`/api/ReportDoctorToPatient/${editingReportId}`, {
          report: reportText,
          medicines
        });
        toast.success('Report updated successfully!');
      } else {
        await axiosInstance.post('/api/ReportDoctorToPatient', {
          patientId: selectedPatient.patientId,
          doctorId,
          report: reportText,
          medicines
        });
        toast.success('Report saved successfully!');
      }

      if (showHistory) {
        await refreshPatientHistory(selectedPatient);
      } else {
        setSelectedPatient(null);
      }

      closeReportModal();
    } catch (err) {
      console.error(err);
      toast.error(
        editingReportId ? 'Failed to update report.' : 'Failed to save report.'
      );
    }
  };

  const isOwnReport = (record) => {
    const recordDoctorId = record.doctorId ?? record.DoctorId;
    return String(recordDoctorId) === String(doctorId);
  };

  const handleMedicationChange = (index, value) => {
    const newMedications = [...reportData.medications];
    newMedications[index] = value;
    setReportData({ ...reportData, medications: newMedications });
  };

  const addMedicationField = () => {
    setReportData({ ...reportData, medications: [...reportData.medications, ''] });
  };

  const removeMedicationField = (index) => {
    const newMedications = reportData.medications.filter((_, i) => i !== index);
    setReportData({ ...reportData, medications: newMedications });
  };

  // ===== Render =====
  if (loading) return <div>Loading patients...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="session-reports-container">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable stacked />
      <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="header-title">
            <Calendar className="header-icon" />
            Patients Sessions
          </h1>
          <p className="header-subtitle">View all patients booked</p>
        </div>
        <div className="date-filter">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '0.5rem 1rem', cursor: 'pointer' }}
            title="Select Date"
          />
        </div>
      </div>

      <div className="patients-grid">
        {patients.map((patient, index) => (
          <div key={patient.patientId ? `${patient.patientId}-${index}` : `res-${index}`} className="patient-card">
            <div className="card-header">
              <div className="patient-info">
                <div className="image-container">
                  <img src={getImageUrl(patient.patientImage || patient.image, patient.patientName)} alt={patient.patientName} className="patient-image" />
                  <div className="online-indicator"></div>
                </div>
                <div className="patient-details">
                  <h3 className="patient-name">{patient.patientName}</h3>
                </div>
              </div>
            </div>

            <div className="last-visit-section">
              <div className="last-visit-info">
                <Clock className="last-visit-icon" />
                <span>Last Visit: {patient.lastVisit || 'N/A'}</span>
              </div>
            </div>

            <div className="card-actions">
              <button onClick={() => viewHistory(patient)} className="btn-history">
                <History className="btn-icon" />
                View History
              </button>
              <button onClick={() => openReport(patient)} className="btn-report">
                <ClipboardList className="btn-icon" />
                Write Report
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* History Modal */}
      {showHistory && selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-header-content">
                <img src={getImageUrl(selectedPatient.patientImage || selectedPatient.image, selectedPatient.patientName || selectedPatient.name)} alt={selectedPatient.name} className="modal-patient-image" />
                <div>
                  <h2 className="modal-title">{selectedPatient.name}</h2>
                  <p className="modal-subtitle">Name: {selectedPatient.patientName}</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="modal-close-btn">
                <X className="close-icon" />
              </button>
            </div>

            <div className="modal-body">
              {selectedPatient.history && selectedPatient.history.length > 0 ? (
                <div className="history-list">
                  {selectedPatient.history.map((record, idx) => (
                    <div key={record.id ?? record.Id ?? idx} className="history-record">
                      <div className="history-record-header">
                        <div className="record-date">
                          <Calendar className="record-date-icon" />
                          <span>
                            {new Date(record.createdAt ?? record.CreatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {isOwnReport(record) && (
                          <button
                            type="button"
                            className="btn-edit-report"
                            onClick={() => openEditReport(selectedPatient, record)}
                          >
                            <Pencil className="btn-icon" />
                            Edit
                          </button>
                        )}
                      </div>
                      <h3 className="record-diagnosis">
                        Report: {record.report ?? record.Report}
                      </h3>
                      <div className="medications-section">
                        <div className="medications-label">
                          <Pill className="medications-icon" />
                          <span>Medications:</span>
                        </div>
                        <div className="medications-list">
                          {(record.medicines ?? record.Medicines ?? []).map((med, i) => (
                            <span key={i} className="medication-tag">{med}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-history-message">No previous medical history for this patient</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-header-content">
                <img src={getImageUrl(selectedPatient.patientImage || selectedPatient.image, selectedPatient.patientName || selectedPatient.name)} alt={selectedPatient.name} className="modal-patient-image" />
                <div>
                  <h2 className="modal-title">
                    {editingReportId ? 'Edit Medical Report' : 'Write Medical Report'}
                  </h2>
                  <p className="modal-subtitle">
                    {selectedPatient.patientName ?? selectedPatient.name}
                  </p>
                </div>
              </div>
              <button onClick={closeReportModal} className="modal-close-btn">
                <X className="close-icon" />
              </button>
            </div>

            <div className="modal-body">

              <div className="form-group">
                <label className="form-label">Full Report</label>
                <textarea
                  value={reportData.notes}
                  onChange={(e) => setReportData({ ...reportData, notes: e.target.value })}
                  rows="4"
                  className="form-textarea"
                  placeholder="Write Report...."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Medications</label>
                <div className="medications-container">
                  {reportData.medications.map((med, index) => (
                    <div key={index} className="medication-input-group">
                      <input
                        type="text"
                        value={med}
                        onChange={(e) => handleMedicationChange(index, e.target.value)}
                        className="medication-input"
                        placeholder="Medication name..."
                      />
                      {reportData.medications.length > 1 && (
                        <button onClick={() => removeMedicationField(index)} className="remove-medication-btn">
                          <X className="btn-icon" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addMedicationField} className="add-medication-btn">+ Add another medication</button>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={saveReport} className="btn-save">
                  <Save className="save-icon" />
                  {editingReportId ? 'Update Report' : 'Save Report'}
                </button>
                <button onClick={closeReportModal} className="btn-cancel">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionReports;