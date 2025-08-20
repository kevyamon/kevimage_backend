const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    unique: true, // Chaque URL originale est unique
    index: true,    // Crée un index pour des recherches ultra-rapides
  },
  imageKey: { // Le nom du fichier dans notre dossier 'cache'
    type: String,
    required: true,
    unique: true,
  },
  originalSize: { // En octets
    type: Number,
    required: true,
  },
  compressedSize: { // En octets
    type: Number,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Image', ImageSchema);