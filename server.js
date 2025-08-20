// --- Imports ---
require("dotenv").config(); // Charge les variables d'environnement du fichier .env
const express = require("express");
const mongoose = require("mongoose");
const sharp = require("sharp");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto"); // Pour générer des noms de fichiers uniques

// --- Import du modèle ---
const Image = require("./models/Image");

// --- Configuration de l'App ---
const app = express();
const PORT = process.env.PORT || 4000; // Le backend tournera sur un port différent du frontend
const CACHE_DIR = path.join(__dirname, "cache");

// Créer le dossier de cache s'il n'existe pas
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// --- Connexion à MongoDB ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connexion à MongoDB réussie !"))
  .catch((err) => console.error("❌ Erreur de connexion à MongoDB:", err));

// --- Route de Ping (Health Check) ---
app.get("/ping", (req, res) => {
  console.log("🏓 Ping received!");
  res.status(200).json({
    message: "pong",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// --- Route Principale de Compression ---
app.get("/compress", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Le paramètre 'url' est manquant." });
  }

  try {
    // 1. VÉRIFIER LE CACHE DANS MONGODB
    const cachedImage = await Image.findOne({ originalUrl: url });

    if (cachedImage) {
      console.log("⚡️ Cache HIT ! Image servie depuis le cache.");
      const imagePath = path.join(CACHE_DIR, cachedImage.imageKey);
      return res.set("Content-Type", cachedImage.mimetype).sendFile(imagePath);
    }

    console.log("🐌 Cache MISS. Compression en cours...");

    // 2. TÉLÉCHARGER L'IMAGE ORIGINALE
    const response = await axios({ url, responseType: "arraybuffer" });
    const originalBuffer = Buffer.from(response.data, "binary");
    const originalSize = originalBuffer.length;

    // 3. COMPRESSER L'IMAGE
    const compressedBuffer = await sharp(originalBuffer)
      .jpeg({ quality: 80 }) // Compromis qualité/taille
      .toBuffer();
    const compressedSize = compressedBuffer.length;

    // 4. SAUVEGARDER L'IMAGE COMPRESSÉE SUR LE DISQUE
    // Générer un nom de fichier unique basé sur le contenu de l'image
    const hash = crypto
      .createHash("md5")
      .update(compressedBuffer)
      .digest("hex");
    const imageKey = `${hash}.jpg`;
    const imagePath = path.join(CACHE_DIR, imageKey);
    fs.writeFileSync(imagePath, compressedBuffer);

    // 5. SAUVEGARDER LES MÉTADONNÉES DANS MONGODB
    const newImage = new Image({
      originalUrl: url,
      imageKey: imageKey,
      originalSize: originalSize,
      compressedSize: compressedSize,
      mimetype: "image/jpeg",
    });
    await newImage.save();
    console.log(
      "💾 Informations de l'image sauvegardées dans la base de données.",
    );

    // 6. ENVOYER L'IMAGE NOUVELLEMENT COMPRESSÉE
    res.set("Content-Type", "image/jpeg").send(compressedBuffer);
  } catch (error) {
    console.error("💥 Erreur lors du traitement de l'image:", error.message);
    res.status(500).json({ error: "Impossible de traiter l'image." });
  }
});

// --- Démarrage du Serveur ---
app.listen(PORT, () => {
  console.log(`🚀 Le backend Kevimage écoute sur http://localhost:${PORT}`);
});
