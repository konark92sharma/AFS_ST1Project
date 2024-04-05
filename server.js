const nodemailer = require('nodemailer'); //nodemailer module, which is used for sending emails from Node.js applications.
const path = require('path'); //provides utilities for working with file and directory paths.
require('dotenv').config(); //This line loads environment variables from a .env file into process.env, making them accessible within the application.
const express = require('express');  // an instance of the Express application is created and stored in the variable app
const mongoose = require('mongoose');

const app = express();
app.use(express.urlencoded({ extended: true })); //true- the URL-encoded data can contain key-value pairs , false - 
app.use(express.json());

let currentDirectory = path.join(__dirname);
app.use(express.static(currentDirectory)); //sets the current directory as the static file directory for serving static files, files that don't change when your application is running.

// Define MongoDB schema for email and OTP
const emailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    oneTimePassword: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        expires: 300, // OTP expires after 5 minutes
        default: Date.now
    } 
});

// Create Mongoose model for email and OTP
const Email = mongoose.model('Email', emailSchema); 

// Connect to MongoDB Compass
mongoose.connect(process.env.MONGODB_URI)


// Nodemailer transporter setup
const transporter = nodemailer.createTransport({  //Nodemailer transporter for sending emails via Gmail's SMTP server.
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Function to generate a random OTP
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 8999).toString(); //to generate a random number between 1000 and 9999, converts it to a string, and returns it.
};

// Route handler for sending OTP
app.post('/generate', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email address is required", success: false });
    }
    const OTP = generateOTP();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "One Time Password (OTP)",
        text: `Your OTP is: ${OTP}`
    };

    transporter.sendMail(mailOptions, async function (err, info) {
        if (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to send OTP", success: false });
        } else {
            console.log('OTP sent successfully!!');
            
            try {
                await Email.create({ email, oneTimePassword: OTP }); //It then attempts to create a new document in the MongoDB database using Mongoose's Email model.
                res.status(200).json({ message: "OTP sent successfully", success: true });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to save OTP to database", success: false });
            }
        }
    });
});

// Route handler for verifying OTP
app.post('/verify', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).send("Email and OTP are required");
    }

    try {
        const storedEmail = await Email.findOne({ email, oneTimePassword: otp });
        if (storedEmail) {
           
            return res.status(200).send("OTP verified successfully");
            
        } else {
            return res.status(400).send("Invalid email or OTP");
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});



// Serve HTML pages
app.get('/generate', (req, res) => { //method to send the HTML file named 'generate.html' located in the currentDirectory.
    res.sendFile(path.join(currentDirectory, 'generate.html'));
});

app.get('/verify', (req, res) => {  //path.join()-to join together multiple parts of a file path to create a single, normalized path string.
    res.sendFile(path.join(currentDirectory, 'verify.html'));
});

const port = 3001;
// app.listen(port, () => {
//     console.log(`Server started on port ${port}`);
// });

app.listen(port, () => {
    console.log("http://localhost:3001");
});





