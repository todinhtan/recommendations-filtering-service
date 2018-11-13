function getDaysInMiliseconds(days) {
  return days * 24 * 60 * 60 * 1000;
}

export default {
  getDaysInMiliseconds: days => getDaysInMiliseconds(days),
};
