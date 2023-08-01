const Response = require("../helper/api-response");
const Validator = require("../helper/api-validator");
const path = require('path');
const { Readable } = require('stream');
const containerName = process.env.CONTAINER_NAME
const azureStorage = require('azure-storage');
const { intoStream } = require("fix-esm").require('into-stream');
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes')
const DB = require("../models");
const azureObject = {};
const { constant } = require('../config/constant');
const blobService = azureStorage.createBlobService(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);


function bufferToStream(binary) {
    return new Readable({
        read() {
            this.push(binary);
            this.push(null);
        }
    });
}

const blbService = async (string) => {
    return azureStorage.createBlobService(
        string  
    );
}

/**
 * @description API to authenticate user for blob container.
 * @param {email,password} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.login = async (req, res) => {
    try {
        var { email, password } = req.body;
        let validation = await Validator.validator({
            email: email,
            password: password
        }, {
            email: 'required|email',
            password: 'required'
        });
        if (validation.status) {
            return Response.customSuccessResponseWithData(res, 'Validation Errors!', validation, 401);
        }
        //code...
        let getUser = await DB.main_db.models.User.findOne({
            attributes: ['id', 'name', 'email', 'password', 'login_count', 'role', 'createdAt'],
            where: { email: AES.encrypt(email, SQLToken), role: 2 },
            include: [{
                model: DB.main_db.models.Company,
                attributes: ['name', 'db_name', 'logo']
            }]
        });
        if (getUser) {
            getUser.email = (getUser.email) ? AES.decrypt(getUser.email, SQLToken) : null;
            getUser.name = (getUser.name) ? AES.decrypt(getUser.name, SQLToken) : null;
            getUser.Company.name = (getUser.Company.name) ? AES.decrypt(getUser.Company.name, SQLToken) : null;
            getUser.Company.db_name = (getUser.Company.db_name) ? AES.decrypt(getUser.Company.db_name, SQLToken) : null;
            getUser.Company.logo = (getUser.Company.logo) ? AES.decrypt(getUser.Company.logo, SQLToken) : null;
            let checkPasswordExists = await Response.comparePassword(password, getUser.password);
            if (checkPasswordExists) {

                await getUser.update({ login_count: getUser.login_count + 1 });
                let token = await Response.generateToken(getUser);
                getUser.dataValues.token = token;
                getUser.dataValues.logged_in = true;
                getUser.dataValues.count = getUser.login_count;
                getUser.dataValues.containerName = constant[getUser.Company.db_name]['container_name'];

                return Response.customSuccessResponseWithData(res, 'User Logged In Successfully.', getUser, 200);
            } else {
                return Response.errorRespose(res, "Password should be matched");
            }
        } else { return Response.errorRespose(res, "Email doen't Exists, Please Check!") }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.errorRespose(res, error);
    }
}

/**
 * @description API to upload file to blob container.
 * @param {container_name,file} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.blobUpload = async (req, res) => {
    try {
        var { container_name } = req.body;
        if (!req.files) {
            return res.status(400).send("No files are received.");
        }
        const blobName = req.files.file.name;
        const stream = bufferToStream(req.files.file.data);
        const streamLength = req.files.file.data.length;
        blobService.createBlockBlobFromStream(
            container_name,
            blobName,
            stream,
            streamLength,
            (err) => {
                if (err) {
                    console.log("err", err);
                    return Response.errorRespose(res, err);
                }
                return Response.successResponse(res, "File Uploaded Successfully");
            }
        );
    } catch (error) {
        console.log("err", error);
        return Response.errorRespose(res, error);
    }
}


/**
 * @description API to List blob container.
 * @param {container_name,file} req 
 * @param {*} res
 * @version V.1
 * @returns
 */
exports.listBlobContainer = async (req, res) => {
    try {
        blobService.listContainersSegmented(null, function(err, result) {
            if (err) {
                console.log("Couldn't list containers");
                console.error(err);
                return Response.errorRespose(res, err);
            } else {
                console.log('Successfully listed containers');
                console.log(result.entries);
                console.log(result.continuationToken);
                return Response.customSuccessResponseWithData(res, "File Listing Successfully",result, 200);
            }
        });
    } catch (error) {
        console.log("err", error);
        return Response.errorRespose(res, error);
    }
}

/**
 * @description API to List blob container.
 * @param {container_name,file} req 
 * @param {*} res
 * @version V.1
 * @returns
 */
exports.listBlob = async (req, res) => {
    try {
        const { containerName } = req.params;
        if (!containerName) {
            return res.status(400).send("Blob name not received.");
        }
        blobService.listBlobsSegmented(containerName, null, function(err, result) {
            if (err) {
                console.log("Couldn't list blobs for container %s", containerName);
                console.error(err);
                return Response.errorRespose(res, err);
            } else {
                console.log('Successfully listed blobs for container %s', containerName);
                console.log(result.entries);
                console.log(result.continuationToken);
                return Response.customSuccessResponseWithData(res, `Successfully listed blobs for container ${containerName}`,result, 200);
            }
        });
    } catch (error) {
        console.log("err", error);
        return Response.errorRespose(res, error);
    }
}


/**
 * @description API to List blob container.
 * @param {container_name,file} req 
 * @param {*} res
 * @version V.1
 * @returns
 */
exports.downloadBlob = async (req, res) => {
    try {
        const { name } = req.params;
        if (!name) {
            return res.status(400).send("Blob name not received.");
        }
        let file_name = name.replace('___','/');
        blobService.getBlobProperties(
            req.containerName,
            file_name,
            function(err, properties, status) {
                if (err) {
                    return Response.errorRespose(res, err.message);
                } else if (!status.isSuccessful) {
                    return Response.errorRespose(res,  "The file %s does not exist");
                } else {
                    res.header('Content-Type', properties.contentType);
                    res.header('Content-disposition', 'attachment; filename=' + file_name);
                    blobService.createReadStream(req.containerName, file_name).pipe(res);
                }
            });
    } catch (error) {
        console.log("err", error);
        return Response.errorRespose(res, error);
    }
}


/**
 * @description API to List blob container.
 * @param {container_name,file} req 
 * @param {*} res
 * @version V.1
 * @returns
 */
exports.downloadBlobPost = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).send("Blob name not received.");
        }
        let file_name = name.replace(/___/g, "/");
        blobService.getBlobProperties(
            req.containerName,
            file_name,
            function(err, properties, status) {
                if (err) {
                    return Response.errorRespose(res, err.message);
                } else if (!status.isSuccessful) {
                    return Response.errorRespose(res,  "The file %s does not exist");
                } else {
                    res.header('Content-Type', properties.contentType);
                    res.header('Content-disposition', 'attachment; filename=' + file_name);
                    blobService.createReadStream(req.containerName, file_name).pipe(res);
                }
            });
    } catch (error) {
        console.log("err", error);
        return Response.errorRespose(res, error);
    }
}