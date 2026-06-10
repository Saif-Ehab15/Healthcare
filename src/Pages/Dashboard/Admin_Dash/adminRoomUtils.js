export const isRoomOccupied = (room) => {
  const status = String(room?.status ?? room?.Status ?? "").toLowerCase();
  if (status === "busy") return true;
  if (status === "available") return false;
  return Boolean(room?.isReserved ?? room?.IsReserved ?? room?.reserved ?? room?.Reserved);
};

export const calculateRoomStats = (data) => {
  if (data && typeof data === "object" && ("room" in data || "Room" in data)) {
    const total = data.room ?? data.Room ?? 0;
    const occupied = data.reserved ?? data.Reserved ?? data.busy ?? data.Busy ?? 0;
    return {
      total,
      occupied,
      available: Math.max(0, total - occupied),
    };
  }

  if (!Array.isArray(data)) {
    return { total: 0, occupied: 0, available: 0 };
  }

  const total = data.length;
  const occupied = data.filter((room) => isRoomOccupied(room)).length;
  return {
    total,
    occupied,
    available: total - occupied,
  };
};
