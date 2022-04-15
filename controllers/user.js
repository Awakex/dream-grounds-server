let jwt = require("jsonwebtoken");
let bcrypt = require("bcrypt");
let User = require("../models/User");

exports.register = function (req, res) {
  let newUser = new User(req.body);
  newUser.hash_password = bcrypt.hashSync(req.body.password, 6);
  newUser.save(function (err, user) {
    if (err) {
      return res.status(400).send({
        message: err,
      });
    } else {
      user.hash_password = undefined;
      return res.json({
        user,
        token: generateToken(user),
      });
    }
  });
};

const generateToken = (user) => {
  return jwt.sign(
    { email: user.email, name: user.name, _id: user._id },
    "&su1*21xS2&1-S(xS2",
    {
      expiresIn: "10h",
    }
  );
};

exports.sign_in = function (req, res) {
  User.findOne(
    {
      email: req.body.email,
    },
    function (err, user) {
      if (err) throw err;
      if (!user || !user.comparePassword(req.body.password)) {
        return res.status(401).json({
          message: "Authentication failed. Invalid user or password.",
        });
      }
      return res.json({
        user,
        token: generateToken(user),
      });
    }
  );
};

exports.loginRequired = function (req, res, next) {
  if (req.user) {
    next();
  } else {
    return res.status(401).json({ message: "Unauthorized user" });
  }
};

exports.profile = function (req, res, next) {
  if (req.user) {
    res.send(req.user);
    next();
  } else {
    return res.status(401).json({ message: "Invalid token" });
  }
};
