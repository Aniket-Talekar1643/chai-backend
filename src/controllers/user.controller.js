import { User } from '../models/user.models.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js'

export const generateAccessAndRefreshToken = async function (userId) {
  try {
    const user = User.findById(userId)
    const accessToken = user.generateAcessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({
      validateBeforeSave: false
    });

    return accessToken, refreshToken;
  } catch (err) {

    throw new ApiError(400, "something went wrong while generating refresh or access token");
  }
}


export const registerUser = async (req, res, next) => {
  //validation not empty
  //check user already exists :username,email
  //check for imgaes ,check for avatar
  //upload to cloudinary,avatar
  //crrate user in db -create entry in d
  //remove password and refresh token from response
  //check user creation success
  try {
    const { username, email, fullname, password } = req.body;

    if (!fullname || !email || !password || !username) {
      throw new ApiError(400, "All fields are required");
    }
    // console.log(req.body)

    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existedUser) {
      throw new ApiError(409, "User with email or username already exists");
    }



    // console.log(req.body);
    // console.log("---------",req.files);

    const avatarLocalPath = req.files.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // console.log("avatarLocalPath, avatarLocalPath",avatarLocalPath, req.files.avatar[0])

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatars file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    console.log("avatar", avatar)

    if (!avatar) {
      throw new ApiError(400, "Avatars file is required")
    }

    const user = await User.create({

      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registration the user")
    }
    return res.status(201).json(
      new ApiResponse(200, createdUser, "User registerd Successfully")
    )
  } catch (err) {
    next(err);
  }
};

//req.body
//username or mail
//find the user
//password check  
//access token
//send cookies
//res successfully
export const loginUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log("Request body:", req.body);

    if ((!username && !email) || !password) {
      throw new ApiError(400, "Username/email and password are required");
    }

    const user = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (!user) {
      throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Incorrect password");
    }

    // const validpassword =user.password === password;
    // if(!validpassword){
    //   throw new ApiError(400,json({
    //     measaage :"password incorrect"
    //   }))
    // }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password =refreshToken")

    const options = {
      httpOnly: true,
      secure: true
    }

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .josn(
        new ApiResponse(
          200,
          {
            user: loggedInUser, accessToken, refreshToken
          },
          "User logged in Successfully"
        )

      )

  } catch (err) {
    console.error("Login error:", err);
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};



export const logoutUser = async function (req, res) {
  try {
    await User.findByIdAndUpdate
      (
        req.user._id,
        {
          $set: {
            refreshToken: undefined
          }
        },
        {
          new: true
        }

      )

    const options = {
      httpOnly: true,
      secure: true
    }
    res.status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .josn({
        message:"user Logout "
      })
  } catch (err) {

  }
}



