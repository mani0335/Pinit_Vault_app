const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  deviceId: String,
  fingerprintId: String,
  faceId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
