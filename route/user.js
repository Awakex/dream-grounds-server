module.exports = (app) => {
  let userHandlers = require("../controllers/user");
  app.route("/user").post(userHandlers.loginRequired, userHandlers.profile);
  app.route("/auth/register").post(userHandlers.register);
  app.route("/auth/sign_in").post(userHandlers.sign_in);
};
