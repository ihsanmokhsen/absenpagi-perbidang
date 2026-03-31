function getAttendanceMode(dateKey) {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  return day === 3 || day === 4 ? "per_bidang" : "full_badan";
}

function isPerBidangMode(dateKey) {
  return getAttendanceMode(dateKey) === "per_bidang";
}

function isFullBadanMode(dateKey) {
  return getAttendanceMode(dateKey) === "full_badan";
}

module.exports = {
  getAttendanceMode,
  isPerBidangMode,
  isFullBadanMode,
};
