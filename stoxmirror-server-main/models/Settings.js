const mongoose = require("mongoose");

// Singleton-style settings document. There's only ever one row here
// (key: "global"), holding site-wide config that used to be hardcoded
// in the frontend — starting with the shared crypto deposit addresses.
const SettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: "global",
  },
  depositWallets: {
    type: Object,
    default: {},
  },
});

module.exports = mongoose.model("settings", SettingsSchema);
