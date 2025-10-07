import mongoose from 'mongoose';

const  connectDB= async ()=>{
    try{
      await mongoose.connect(process.env.MONGODB)
      console.log("MongoDB connected Successfully")
    }
    catch(err){
        console.log("MongoDB connection err:"+err)

    }
}
export default connectDB;