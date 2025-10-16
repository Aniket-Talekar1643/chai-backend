import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({ 
  cloud_name: "dywg7uscm", 
  api_key: "125682687469793", 
  api_secret: "y1e_VNQQrbZFy8SPUorgNfSE-8o"
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        console.log("localFilePath", localFilePath,  process.env.CLOUDINARY_CLOUD_NAME,process.env.CLOUDINARY_API_KEY )
        if (!localFilePath) return null;
       
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
       
        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.log("error", error )
        fs.unlinkSync(localFilePath) 
        return null;
    }
}



export {uploadOnCloudinary}