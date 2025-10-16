import { ApiError } from "../utils/ApiError.js"
import jwt from 'jsonwebtoken';
import {User}  from '../models/user.models.js';


export const verifyJWT=async function(req,res,next){
   try{
        const token = req.cookie?.accessToken || req.header("Authorization")?.replace("Bearer ","")

         if(!token){
            throw new ApiError(401,"Unauthorized request")
        }

        const decodeToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

        const user= await User.findById(decodeToken?._id).select("-password -refreshToken");

        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
        req.user=user;
        next();
   }catch(err){
       throw new ApiError(401,err?.message|| "invalid access token");
   }
}