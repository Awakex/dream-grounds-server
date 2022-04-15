const mongoose = require("mongoose");

Schema = mongoose.Schema;

const UserOwnSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  money: { type: Number, default: 0 },
});

const UserOwn = mongoose.model("UserOwn", UserOwnSchema);
module.exports = UserOwn;
