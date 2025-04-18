const MusicLibrary = require('../models/musicLirbrary'); // Correct import path for your model
const fs = require("fs");
const cloudinary = require("../config/cloudinaryConfig"); 

const uploadMusicLibrary = async (req, res) => {
    try {
        const { musicName, description } = req.body;

        const musicFile = req.files?.["music"]?.[0]; // Check if the file exists

        console.log(musicFile);
        
        // Validate required fields
        if (!musicName || !musicFile) {
            return res.status(400).json({ message: "Music name and file are required." });
        }

        // Extract music file details
        const musicURL = {
            path: musicFile.path,
            public_id: musicFile.filename,
        };

        // Create a new music entry
        const uploadMusic = new MusicLibrary({
            musicName,
            description,
            musicAudio: musicURL, 
        });

        // Save to the database
        const savedMusic = await uploadMusic.save();

        // Send success response
        res.status(201).json({
            message: "Music uploaded successfully!",
            data: savedMusic,
        });
    } catch (error) {
        // Handle errors
        console.error("Error uploading music:", error);
        res.status(500).json({ message: "Failed to upload music.", error });
    }
};
  

const fetchAllMusic = async (req, res) => {
    try {
        // Fetch all music entries from the database
        const allMusic = await MusicLibrary.find();

        // Check if the library is empty
        if (allMusic.length === 0) {
            return res.status(404).json({ message: "No music found in the library." });
        }

        // Send success response with the data
        res.status(200).json({
            message: "Music fetched successfully!",
            data: allMusic,
        });
    } catch (error) {
        // Handle errors
        console.error("Error fetching music:", error);
        res.status(500).json({ message: "Failed to fetch music.", error });
    }
};



module.exports = { uploadMusicLibrary ,fetchAllMusic};
