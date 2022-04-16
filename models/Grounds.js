const mongoose = require("mongoose");

Schema = mongoose.Schema;

const GroundSchema = new Schema({
  name: { type: String, trim: true, require: true },
  type: { type: String, trim: true, require: true },
  incomePerTick: { type: Number, require: true },
  price: { type: Number, require: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User" },
});

const Ground = mongoose.model("Ground", GroundSchema);
module.exports = Ground;
