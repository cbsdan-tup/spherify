const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    firstName: { 
        type: String, 
        maxlength: [30, 'Your First Name cannot exceed 30 characters'],
        trim: true
    },
    lastName: { 
        type: String, 
        maxlength: [30, 'Your Last Name cannot exceed 30 characters'],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'Please enter your Email Address'],  
        unique: true,
        validate: [validator.isEmail, 'Please enter a Valid Email Address']
    },
    avatar: {
        public_id: { 
            type: String, 
        },
        url: { 
            type: String, 
        },
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    permissionToken: {
        type: String,
    },
    createdAt: { 
        type: Date, 
        required: true, 
        default: Date.now 
    },
});

userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    });
}

const User = mongoose.model('User', userSchema);

module.exports = User;