const app = require("express")();
const http = require("http").Server(app);
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
let cors = require("cors");

const io = new Server(http, {
  cors: {
    origin: "*",
  },
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.use(function (req, res, next) {
  if (req.headers?.authorization?.split(" ")[0] === "Baerer") {
    jwt.verify(
      req.headers.authorization.split(" ")[1],
      "&su1*21xS2&1-S(xS2",
      function (err, decode) {
        if (err) req.user = undefined;
        req.user = decode;
        next();
      }
    );
  } else {
    req.user = undefined;
    next();
  }
});

let routes = require("./route/user");
routes(app);

app.use(function (req, res) {
  res.status(404).send({ url: req.originalUrl + " not found" });
});

let url = "mongodb://localhost:27017/dreamgrounds";
let PORT = process.env.PORT || 3000;

const PREFIXES = {
  DATABASE: "[DATABASE]",
  SERVER: "[SERVER]",
  GROUNDS: "[GROUNDS]",
};

async function start() {
  try {
    mongoose.connect(url, { useUnifiedTopology: true, useNewUrlParser: true });
    http.listen(PORT, () => {
      console.log(
        `${PREFIXES.SERVER} Server has been started on port: ${PORT}`
      );
      generateGrounds();
    });
  } catch (e) {
    console.log(e);
  }
}

start();

let playersOnline = 0;
let onlineUsers = [];

let randomItemFromArray = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

const UserModel = require("./models/User");
const UserOwnModel = require("./models/UserOwn");
const GroundModel = require("./models/Grounds");

let generateGrounds = async () => {
  let count = await GroundModel.find().count();

  if (count) {
    console.log(`${PREFIXES.DATABASE} Grounds already created. Save skip`);
    return;
  }

  let availableGrounds = [
    { type: "ISLAND", name: "Летний остров" },
    { type: "ICELAND", name: "Морозный остров" },
    { type: "DESERTLAND", name: "Пустынный остров" },
    { type: "LAVALAND", name: "Лавовый остров" },
    { type: "CRYSTALLAND", name: "Кристальный остров" },
    { type: "TOXICLAND", name: "Ядовитый остров" },
    { type: "WATERLAND", name: "Водный остров" },
    { type: "CRYSTALLAND2", name: "Кристальный остров" },
    { type: "DEADLAND", name: "Мертвый остров" },
  ];

  let grounds = [...Array(100)].map((land, index) => {
    let incomePerTick = Math.floor(Math.random() * 150);
    let generatedLand = randomItemFromArray(availableGrounds);
    return {
      name: generatedLand.name,
      type: generatedLand.type,
      incomePerTick,
      price: incomePerTick * 128,
      ownerId: null,
    };
  });

  console.log(`${PREFIXES.GROUNDS} Grounds generated.`);
  await GroundModel.insertMany(grounds, () => {
    console.log(`${PREFIXES.DATABASE} Grounds saved.`);
  });
};

let getUser = async (id) => {
  const user = await UserModel.findById({ _id: id }, { hash_password: 0 });
  return user;
};

let getUserOwn = async (id) => {
  const userOwn = await UserOwnModel.findOne({ userId: id });
  return userOwn;
};

let userTakeMoney = async (id, amount) => {
  let userOwn = await getUserOwn(id);
  let money = userOwn.money - amount;
  await UserOwnModel.findOneAndUpdate(
    { userId: id },
    {
      $set: { money: money },
    }
  );
  io.to(onlineUsers[id]).emit("money:update", money);
};

let handleBuyGround = async (groundId, userId) => {
  let ground = await GroundModel.findOne({ _id: groundId });

  if (ground) {
    if (!ground.ownerId) {
      let user = await getUser(userId);
      let userOwn = await getUserOwn(userId);
      if (userOwn.money < ground.price) {
        console.log(user.money, ground.price, "no money");
        return;
      }

      await userTakeMoney(user.id, ground.price);
      await GroundModel.findOneAndUpdate(
        { _id: groundId },
        {
          $set: { ownerId: user.id },
        }
      );

      await sendGrounds();

      console.log(
        `[GROUNDS] Ground ID:${groundId} successfully purchased by ${userId}`
      );
    } else {
      console.log(`[GROUNDS] Ground ID:${groundId} already have owner`);
    }
  }
};

let sendGrounds = async (toUserId) => {
  let grounds = await GroundModel.find();
  if (!toUserId) {
    io.emit("grounds:list", grounds);
  } else {
    io.to(onlineUsers[toUserId]).emit("grounds:list", grounds);
  }
};

setInterval(async () => {
  let grounds = await GroundModel.find();
  if (grounds) {
    for (const ground of grounds) {
      if (ground.ownerId) {
        let user = await getUserOwn(ground.ownerId);
        if (user) {
          let money = user.money + ground.incomePerTick;
          await UserOwnModel.findOneAndUpdate(
            { userId: ground.ownerId },
            {
              $set: { money: money },
            }
          );

          io.to(onlineUsers[ground.ownerId]).emit("money:update", money);
        }
      }
    }
  }
}, 10000);

const initUser = async (id, socketId) => {
  onlineUsers[id] = socketId;
  let user = await getUser(id);
  if (user) {
    let userOwn = await UserOwnModel.findOne({ userId: id });
    if (!userOwn) {
      const newUserOwn = new UserOwnModel({
        userId: id,
        money: 15000,
      });

      newUserOwn.save();
    }

    io.to(socketId).emit("user:get", { user, userOwn });
    playersOnline += 1;
    emitUpdateOnline();
  } else {
    console.log("User dont exist, kick from server /todo");
  }
};

io.on("connection", (socket) => {
  console.log("New connection!");
  let { id } = socket.handshake.query;
  initUser(id, socket.id);

  socket.on("disconnect", (socket) => {
    playersOnline -= 1;
    emitUpdateOnline();
  });

  socket.on("grounds:get", () => {
    sendGrounds(id);
  });

  socket.on("grounds:buy", (groundId) => handleBuyGround(groundId, id));
});

const emitUpdateOnline = () => {
  io.emit("online:update", playersOnline);
};
