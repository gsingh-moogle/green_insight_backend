const express =require("express");
const router=express.Router();
const {validateAdmin,validateContainerAPI} = require("../middleware/auth");
const BlobController=require("../Controller/BlobContainerController");
const Validations=require("../helper/api-validator");


//Bucket Upload 

router.post("/login",BlobController.login);
router.post("/bucket/upload",validateContainerAPI,BlobController.blobUpload);
router.get("/bucket/list/container",validateContainerAPI,BlobController.listBlobContainer);
router.get("/bucket/list/:containerName",validateContainerAPI,BlobController.listBlob);
router.get("/bucket/download/:name",validateContainerAPI,BlobController.downloadBlob);

module.exports=router;