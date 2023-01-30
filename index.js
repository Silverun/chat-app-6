const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mysql = require("mysql2");
const { instrument } = require("@socket.io/admin-ui");

app.use(cors());
app.use(express.json());

const DATABASE_URL =
  "mysql://b8f0dd4b026da6:b0296e6d@eu-cdbr-west-03.cleardb.net/heroku_f6a10ef41c866d9";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://admin.socket.io", "http://localhost:3000"],
    credentials: true,
  },
});

const db = mysql.createConnection(DATABASE_URL);

db.connect(function (err) {
  if (err) {
    return console.error("error: " + err.message);
  } else {
    console.log("Connected to Heroku DB");
  }
});

instrument(io, {
  auth: false,
  mode: "development",
});

io.on("connection", (socket) => {
  socket.on("enter_chat", (userName, callback) => {
    db.query(
      "INSERT INTO users (user_name) VALUES (?) ON DUPLICATE KEY UPDATE user_name = VALUES(user_name)",
      [userName],
      (error, result) => {
        if (error) {
          console.log(err);
        }
      }
    );
    db.query(
      "SELECT * FROM messages WHERE recipient = ?",
      [userName],
      (error, result1) => {
        if (error) {
          console.log(error);
        } else {
          db.query("SELECT * FROM users", (error, result2) => {
            if (error) {
              console.log(error);
            } else {
              callback({ result: result1, names: result2 });
            }
          });
        }
      }
    );
  });

  socket.on("message_send", (messageData, callback) => {
    db.query(
      "INSERT INTO messages (sender, recipient, title, message) VALUES (?,?,?,?)",
      [
        messageData.sender,
        messageData.recipient,
        messageData.title,
        messageData.message,
      ],
      (error, result) => {
        if (error) {
          console.log(error);
          callback({ message: "Database error!" });
        } else {
          callback({ message: "Message successfully send!" });
        }
      }
    );
    io.emit("receive_message", messageData);
  });
});

server.listen(process.env.PORT || 3001, () => {
  console.log("Server is running");
});
