const Profile =require("../models").Profile;
const User =require("../models").Users;
const Response=require("../helper/api-response");
const DB = require("../models");
const AES = require('mysql-aes')
const SQLToken = process.env.MY_SQL_TOKEN;
const Validator =require("../helper/api-validator");

const multer = require('multer')
const path = require('path');
const image_path = '/images/profile';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("destination ")
        const filePath = path.join(__dirname, '../public'+image_path);
        cb(null, filePath)
    },
    filename: function (req, file, cb) {
        console.log("filename ")
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let filename = file.originalname;
        filename = filename.replace(/\s/g, '');
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + filename);
    }
  })
const upload = multer({ storage: storage }).single('image')

exports.getProfileDetails=async(req,res) => {
    try {
      
            const loggenInUser = req.currentUser.data.id; 
            let getUser = await DB.main_db.models.User.findOne({
                attributes: ['email'],
                where:{id:loggenInUser},
                include:[{
                    model: DB.main_db.models.Profile,
                    attributes: ['first_name','last_name','country_code','image','phone_number']
                }]
            });
            
            if(getUser){
                getUser.dataValues.email = (getUser?.dataValues?.email)?AES.decrypt(getUser.dataValues.email, SQLToken):null;
                getUser.Profile.dataValues.first_name = (getUser?.Profile?.dataValues?.first_name)?AES.decrypt(getUser.Profile.dataValues.first_name, SQLToken):null;
                getUser.Profile.dataValues.last_name = (getUser?.Profile?.dataValues?.last_name)?AES.decrypt(getUser.Profile.dataValues.last_name, SQLToken):null;
                getUser.Profile.dataValues.phone_number = (getUser?.Profile?.dataValues?.phone_number)?AES.decrypt(getUser.Profile.dataValues.phone_number, SQLToken):null;
                return Response.customSuccessResponseWithData(res,'User Profile',getUser,200);
            } else { return Response.errorRespose(res,'No Record Found!');}
    } catch (error) {
        console.log('____________________________________________________________error',error);
    }
}

exports.updateUserDetails=async(req,res) => {
    try {
            let {first_name, last_name, email, phone_number}=req.body;
            let validation = await Validator.validator({
                first_name: first_name,
                last_name: last_name,
                email: email,
                phone_number: phone_number
            },{
                first_name: 'required',
                last_name: 'required',
                email: 'required|email',
                phone_number: 'numeric'
            });
            if(validation.status) {
                return Response.customSuccessResponseWithData(res,'Validation Errors!',validation,401);
            }
            const loggenInUser = req.currentUser.data.id; 
            let getUser = await DB.main_db.models.User.findOne({
                where:{id:loggenInUser},
                include:[{
                    model: DB.main_db.models.Profile,
                    attributes: ['first_name','last_name','country_code','phone_number']
                }]
            });
                
            //get profile details
            if(getUser){
                let encryptedProfileData = {
                    first_name:AES.encrypt(first_name, SQLToken),
                    last_name:AES.encrypt(last_name, SQLToken),
                    phone_number: (phone_number)?AES.encrypt(phone_number.toString(), SQLToken):null
                }
             let userEncryptedData = {
                    name :AES.encrypt(`${first_name} ${last_name}`, SQLToken),
                }
                if(email) {
                    userEncryptedData.email = AES.encrypt(email, SQLToken)
                }

                await getUser.update(userEncryptedData).then((user) => {
                    DB.main_db.models.Profile.findOne({where:{user_id:user.id}}).then((profile) =>{
                        return profile.update(encryptedProfileData)
                    })
                });
                
                return Response.successResponse(res,'User Profile Updated.');
            } else { return Response.errorRespose(res,'No Record Found!');}
    } catch (error) {
        console.log('____________________________________________________________error',error);
    }
}


exports.updateUserPassword=async(req,res) => {
    try {
        console.log("test111")
            let {old_password, new_password}=req.body;
            let validation = await Validator.validator({
                old_password: old_password,
                new_password: new_password
            },{
                old_password: 'required',
                new_password: 'required'
            });
            if(validation.status) {
                return Response.customSuccessResponseWithData(res,'Validation Errors!',validation,401);
            }
            const loggenInUser = req.currentUser.data.id; 
            let getUser = await DB.main_db.models.User.findOne({
                where:{id:loggenInUser},
            });
           //get profile details
            if(getUser){
                let checkPasswordExists= await Response.comparePassword(old_password,getUser.password);
                if(checkPasswordExists) {
                    let generateHash = await Response.encryptPassword(new_password);
                    await getUser.update({
                        password : generateHash
                    })
                    return Response.successResponse(res,'Password Updated Successfully.');
                }
                
                return Response.errorRespose(res,'Current Password Is Incorrect!');
            } else { return Response.errorRespose(res,'No Record Found!');}
    } catch (error) {
        console.log('____________________________________________________________error',error);
    }
}


exports.updateUserProfileImage=async(req,res) => {
    try {
        const loggenInUser = req.currentUser.data.id; 
        console.log("loggenInUser ", loggenInUser)
        upload(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                console.log("works")
                return Response.errorRespose(res,err);
            } else if (err) {
                console.log("works2")
                // An unknown error occurred when uploading.
                return Response.errorRespose(res,err);
            }

            
            let updateObject = await DB.main_db.models.Profile.findOne({
                where:{user_id:loggenInUser}
            }).then(function(obj) {
                // update
                if(obj)
                    return obj.update({
                        image : `${image_path}/${res.req.file.filename}`
                    });
            });
            
            if(updateObject){
                return Response.successResponse(res,'Profile Image Uploaded Successfully.');
            }
            // Everything went fine.
            return Response.errorRespose(res,'Error while Uploading Image!');
        })
      
    } catch (error) {
        console.log('____________________________________________________________error',error);
    }
}

