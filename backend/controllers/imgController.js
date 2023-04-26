require("dotenv").config();

const User = require("../models/authModel");
const multer = require("multer");
const Grid = require("gridfs-stream");
const { GridFsStorage } = require("multer-gridfs-storage");
const path = require("path");
const GridFSBucket = require("mongodb").GridFSBucket;
const storage = new GridFsStorage({
  url: process.env.MONGO_URL,
  // options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const match = ["image/png", "image/jpeg", "image/webp"];

    if (match.indexOf(file.mimetype) === -1) {
      const filename = `${Date.now()}-bezkoder-${file.originalname}`;
      return filename;
    }

    return {
      bucketName: "uploadsImages",
      filename: `${Date.now()}${path.extname(file.originalname)}`,
    };
  },
});

const upload = multer({ storage }).single("img");

const saveFileName = async (req, res) => {
  if (!req.file.filename) {
    const user = await User.findById({ _id: req.user });
    return res.json(user);
  }
  try {
    let updateUser = await User.findByIdAndUpdate(
      { _id: req.user },
      { $set: { imgName: req.file.filename } },
      { returnOriginal: false }
    );
    const token = { token: req.jwt };
    updateUser = { ...updateUser._doc, ...token };
    res.json(updateUser);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
const MongoClient = require("mongodb").MongoClient;

const mongoClient = new MongoClient(process.env.MONGO_URL);

const deleteImg = async (req, res, next) => {
  try {
    await mongoClient.connect();

    const database = mongoClient.db("test");
    const bucket = new GridFSBucket(database, {
      bucketName: "uploadsImages",
    });

    const file = await database
      .collection("uploadsImages.files")
      .findOne({ filename: req.params.name });
    bucket.delete(file._id);
    next();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

const getImg = async (req, res) => {
  try {
    await mongoClient.connect();

    const database = mongoClient.db("test");
    const bucket = new GridFSBucket(database, {
      bucketName: "uploadsImages",
    });

    let downloadStream = bucket.openDownloadStreamByName(req.params.name);

    downloadStream.on("data", function (data) {
      return res.status(200).write(data);
    });

    downloadStream.on("error", function (err) {
      return res.status(404).send({ message: "Cannot download the Image!" });
    });

    downloadStream.on("end", () => {
      return res.end();
    });
  } catch (error) {
    return res.status(500).send({
      message: error.message,
    });
  }
};

module.exports = { upload, saveFileName, getImg, deleteImg };