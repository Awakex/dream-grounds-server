const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, trim: true, require: true },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    require: true,
  },
  hash_password: { type: String },
  created: { type: Date, default: Date.now },
});

UserSchema.methods.comparePassword = function (password) {
  return bcrypt.compareSync(password, this.hash_password);
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
