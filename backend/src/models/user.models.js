import mongoose from 'mongoose';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique:true,
        lowercase:true,
        trim : true
    },
    password: {
        type: String,
        required: true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim : true
    },
    phonenumber:{
        type:Number,
        required:true,
    },
    role:{
        type:String,
        enum:["user","admin"],
        default:"user",
    },
    AccessToken:{
        type: String,
    },
    RefreshToken:{
        type: String,
    },
    resetPasswordToken:{
        type: String,
    },
    resetPasswordExpiry:{
        type: Date,
    }
},{ timestamps: true });

userSchema.pre("save", async function(){
    if(!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password,10);
});

userSchema.methods.isPasswordCorrect = async function(password){
 return await bcrypt.compare(password,this.password)
}

userSchema.methods.GenerateAccessToken = function(){
   return jwt.sign({
        name : this.name,
        _id: this._id,
        email:this.email,
        phonenumber:this.phonenumber
    },
process.env.ACCESS_TOKEN_SECRET,
{
    expiresIn :process.env.ACCESS_TOKEN_EXPIRY || "1d"
}
)
}

userSchema.methods.GenerateRefreshToken = function(){
   return jwt.sign({
        _id: this._id,
    },
process.env.REFRESH_TOKEN_SECRET,
{
    expiresIn :process.env.REFRESH_TOKEN_EXPIRY || "7d"
}
)
}

export const User = mongoose.model('User', userSchema);
