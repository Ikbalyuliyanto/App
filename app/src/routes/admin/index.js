import express from "express";
import produk from "./produk.js";

const router = express.Router();

router.use("/produk", produk);

export default router;


