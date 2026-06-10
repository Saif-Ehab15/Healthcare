export const DEFAULT_DEPARTMENTS = [
  { id: 1, name: "Heart" },
  { id: 2, name: "Kidney" },
  { id: 3, name: "Liver" },
];

export const ROOM_TYPES = [
  { value: "ICU", label: "ICU", backendValue: "ICU", endpoint: "/api/ICU/department" },
  { value: "Normal", label: "Normal", backendValue: "Room", endpoint: "/api/Room/department" },
  { value: "Emergency", label: "Emergency", backendValue: "Emergency", endpoint: "/api/Emergency/department" },
];

export const HUB_ICON_SIZE = 18;

export const hubValue = (data, key) => {
  if (!data || !key) return undefined;
  if (data[key] !== undefined) return data[key];
  const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
  return data[pascalKey];
};

export const hubSuccess = (data) => Boolean(hubValue(data, "success"));

export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export const getLoggedInUser = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getLoggedInUserId = () => {
  const user = getLoggedInUser();
  return String(user?.id ?? user?.Id ?? "");
};

export const buildReleaseReportDto = ({
  appointmentId = 0,
  report = "Released from UI",
  medicines = [],
  createdBy = "",
}) => ({
  id: appointmentId,
  report,
  medicines,
  endTime: new Date().toISOString(),
  createdBy,
});

export const getHubUrl = (axiosInstance) => {
  const apiBase = axiosInstance.defaults.baseURL || window.location.origin;
  return `${apiBase.replace(/\/$/, "")}/appointmentHub`;
};

export const normalizeDoctorOption = (item) => ({
  id: String(item?.doctorId ?? item?.DoctorId ?? item?.id ?? item?.Id ?? ""),
  name: item?.doctorName ?? item?.DoctorName ?? item?.name ?? item?.Name ?? "Unknown Doctor",
  isAssignedToRoom: Boolean(item?.isAssignedToRoom ?? item?.IsAssignedToRoom),
});

export const mergeDoctorOptions = (...lists) => {
  const merged = new Map();
  lists.flat().forEach((item) => {
    const doctor = normalizeDoctorOption(item);
    if (!doctor.id) return;
    const existing = merged.get(doctor.id);
    merged.set(doctor.id, {
      ...doctor,
      isAssignedToRoom: existing?.isAssignedToRoom || doctor.isAssignedToRoom,
    });
  });
  return Array.from(merged.values()).sort((a, b) => {
    if (a.isAssignedToRoom !== b.isAssignedToRoom) {
      return a.isAssignedToRoom ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
};
