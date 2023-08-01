const sequelize = require('sequelize');
const Op = sequelize.Op;
const Response = require("../helper/api-response");
const { check, validationResult } = require('express-validator');
const Validations = require("../helper/api-validator");
const moment = require('moment');
const randomstring = require("randomstring");
const Decarb = require("../models").DecarbRecommendation;
const AES = require('mysql-aes');
const SQLToken = process.env.MY_SQL_TOKEN;


/**
 * @description API to get project details.
 * @param {id} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getProjectDetails = async (req, res) => {
    try {
        const { id } = req.params
        const where = {}
        if (id) {
            where[Op.and] = []
            where[Op.and].push({ id: id });
        }

        let getProject = await req.db.Project.findOne({
            attributes: ['id', 'project_name', 'start_date', 'end_date',
                'customize_emission', 'emission_percent', 'actual_emission', 'desc', 'type', 'project_unique_id', 'decarb_id', 'region_id'],
            where: where,
            include: [
                {
                    model: req.db.ProjectManager,
                    attributes: ['name', 'email']
                },
                {
                    model: req.db.DecarbRecommendation,
                    attributes: ['lane_name', 'origin', 'destination',
                        'LOB', 'fuel_type', 'emissions', 'date', 'grs_wgt_qty',
                        'loaded_miles', 'uploaded_miles', 'mpg', 'fuel_use', 'type', 'recommended_type', 'decarb_id'],
                    on: {
                        'decarb_id': { [Op.eq]: sequelize.col('Project.decarb_id') },
                    },
                    order: [[sequelize.col('decarb_recommendations.id'),'desc']]
                },

            ],
            
        });
        let projectDetail = []
        //check password is matched or not then exec
        if (getProject) {
            //Project Details
            let lane_name = null;
            getProject.dataValues.project_name = (getProject?.dataValues?.project_name) ? AES.decrypt(getProject.dataValues.project_name, SQLToken) : null;
            getProject.dataValues.customize_emission = (getProject?.dataValues?.customize_emission) ? parseFloat(AES.decrypt(getProject.dataValues.customize_emission, SQLToken)) : null;
            getProject.dataValues.emission_percent = (getProject?.dataValues?.emission_percent) ? AES.decrypt(getProject.dataValues.emission_percent, SQLToken) : null;
            getProject.dataValues.desc = (getProject?.dataValues?.desc) ? AES.decrypt(getProject.dataValues.desc, SQLToken) : null;
            getProject.dataValues.actual_emission = (getProject?.dataValues?.actual_emission) ? AES.decrypt(getProject.dataValues.actual_emission, SQLToken) : null;
            //Manager Details
            if (getProject?.ProjectManager?.name) {
                getProject.ProjectManager.name = (getProject?.ProjectManager?.name) ? AES.decrypt(getProject.ProjectManager.name, SQLToken) : null;
            }
            if (getProject?.ProjectManager?.email) {
                getProject.ProjectManager.email = (getProject?.ProjectManager?.email) ? AES.decrypt(getProject.ProjectManager.email, SQLToken) : null;
            }
            if (getProject.dataValues.type === "carrier_shift") {
                let date = moment();
                let currentData = date.format("YYYY-MM-DD");
                let pastData = date.subtract(1, "year").format("YYYY-MM-DD");


                let decarb = [];
                console.log("dddd sssssssssssssssssssgetProject.DecarbRecommendations", getProject.dataValues.DecarbRecommendations[0]?.lane_name)
                // for (const property of getProject.DecarbRecommendations) {
                if (getProject.dataValues.DecarbRecommendations.length > 0) {

                  //  getProject.DecarbRecommendations.reverse();
                    let laneEmissionData = await req.db.Emission.findAll({
                        attributes: [[sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) DIV SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                        [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")/1000000))'), 'emission'],
                        [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")) )'), 'shipments'],
                            'carrier_name',
                            'carrier_logo'
                        ],
                        where: {
                            'name': getProject.dataValues.DecarbRecommendations[0]?.lane_name, date: {
                                [Op.between]: [pastData, currentData],
                            },
                            'region_id': getProject.dataValues.region_id
                        },
                        group: ['carrier_name', 'carrier_logo'],
                        order: [['emission', 'asc']],
                        raw: true
                    });
                    console.log("laneEmissionData", laneEmissionData)
                    let origin = AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.origin, SQLToken)
                    let laneName = AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.lane_name, SQLToken)
                    let destination = AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.destination, SQLToken)
                    let typeDetail = AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.type, SQLToken)
                    for (const propertylane of laneEmissionData) {
                        decarb.push({
                            emissions: propertylane.emission,
                            // carrier_name: propertylane?.carrier_name ? AES.decrypt(propertylane.carrier_name, SQLToken) : null,
                            carrier_logo: propertylane.carrier_logo,
                            lane_name: laneName,
                            origin: origin,
                            destination: destination,
                            // LOB: AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.LOB, SQLToken),
                            // fuel_type: AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.fuel_type, SQLToken),
                            // uploaded_miles: AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.uploaded_miles, SQLToken),
                            // fuel_use: AES.decrypt(getProject.dataValues.DecarbRecommendations[0]?.fuel_use, SQLToken),
                            type: typeDetail,
                        })
                        lane_name = laneName;

                    }

                    // }
                    console.log("decarbdecarbdecarb", decarb)
                    projectDetail = decarb
                    getProject.dataValues.DecarbRecommendations = [];
                }
                // getProject.dataValues.DecarbRecommendations = [];
                // for (const propertylane of laneEmissionData) {
                //     route.push({
                //         origin: propertyOrigin,
                //         destination: propertyDestination,
                //         type: "carrier_shift",
                //         emissions: propertylane.emission,
                //         fuel_type: "RD80",
                //         carrier_name: propertylane?.carrier_name ? AES.decrypt(propertylane.carrier_name, SQLToken) : null,
                //         carrier_logo: propertylane.carrier_logo
                //     })

                //     let decarb = [];
                //     for (const property of laneEmissionData) {
                //         property.dataValues.lane_name = (property?.dataValues?.lane_name) ? AES.decrypt(property.dataValues.lane_name, SQLToken) : null;
                //         property.dataValues.origin = (property?.dataValues?.origin) ? AES.decrypt(property.dataValues.origin, SQLToken) : null;
                //         property.dataValues.destination = (property?.dataValues?.destination) ? AES.decrypt(property.dataValues.destination, SQLToken) : null;
                //         property.dataValues.LOB = (property?.dataValues?.LOB) ? AES.decrypt(property.dataValues.LOB, SQLToken) : null;
                //         property.dataValues.fuel_type = (property?.dataValues?.fuel_type) ? AES.decrypt(property.dataValues.fuel_type, SQLToken) : null;
                //         property.dataValues.emissions = (property?.dataValues?.emissions) ? AES.decrypt(property.dataValues.emissions, SQLToken) : null;
                //         property.dataValues.grs_wgt_qty = (property?.dataValues?.grs_wgt_qty) ? AES.decrypt(property.dataValues.grs_wgt_qty, SQLToken) : null;
                //         property.dataValues.loaded_miles = (property?.dataValues?.loaded_miles) ? AES.decrypt(property.dataValues.loaded_miles, SQLToken) : null;
                //         property.dataValues.uploaded_miles = (property?.dataValues?.uploaded_miles) ? AES.decrypt(property.dataValues.uploaded_miles, SQLToken) : null;
                //         property.dataValues.mpg = (property?.dataValues?.mpg) ? AES.decrypt(property.dataValues.mpg, SQLToken) : null;
                //         property.dataValues.fuel_use = (property?.dataValues?.fuel_use) ? AES.decrypt(property.dataValues.fuel_use, SQLToken) : null;
                //         property.dataValues.type = (property?.dataValues?.type) ? AES.decrypt(property.dataValues.type, SQLToken) : null;
                //         decarb.push(property);
                //         lane_name = property.dataValues.lane_name;

                //     }
                //     getProject.dataValues.DecarbRecommendations = [];
                //     getProject.dataValues.DecarbRecommendations = decarb;
                // }

            }

            else {


                if (getProject.DecarbRecommendations) {
                    console.log(getProject.DecarbRecommendations,'getProject.DecarbRecommendations');
                    getProject.DecarbRecommendations.reverse();
                    let decarb = [];
                    for (const property of getProject.DecarbRecommendations) {
                        if (AES.decrypt(property.dataValues.type, SQLToken) == getProject.dataValues.type && property.dataValues.recommended_type == 'recommended') {
                            property.dataValues.lane_name = (property?.dataValues?.lane_name) ? AES.decrypt(property.dataValues.lane_name, SQLToken) : null;
                            property.dataValues.origin = (property?.dataValues?.origin) ? AES.decrypt(property.dataValues.origin, SQLToken) : null;
                            property.dataValues.destination = (property?.dataValues?.destination) ? AES.decrypt(property.dataValues.destination, SQLToken) : null;
                            property.dataValues.LOB = (property?.dataValues?.LOB) ? AES.decrypt(property.dataValues.LOB, SQLToken) : null;
                            property.dataValues.fuel_type = (property?.dataValues?.fuel_type) ? AES.decrypt(property.dataValues.fuel_type, SQLToken) : null;
                            property.dataValues.emissions = (property?.dataValues?.emissions) ? AES.decrypt(property.dataValues.emissions, SQLToken) : null;
                            property.dataValues.grs_wgt_qty = (property?.dataValues?.grs_wgt_qty) ? AES.decrypt(property.dataValues.grs_wgt_qty, SQLToken) : null;
                            property.dataValues.loaded_miles = (property?.dataValues?.loaded_miles) ? AES.decrypt(property.dataValues.loaded_miles, SQLToken) : null;
                            property.dataValues.uploaded_miles = (property?.dataValues?.uploaded_miles) ? AES.decrypt(property.dataValues.uploaded_miles, SQLToken) : null;
                            property.dataValues.mpg = (property?.dataValues?.mpg) ? AES.decrypt(property.dataValues.mpg, SQLToken) : null;
                            property.dataValues.fuel_use = (property?.dataValues?.fuel_use) ? AES.decrypt(property.dataValues.fuel_use, SQLToken) : null;
                            property.dataValues.type = (property?.dataValues?.type) ? AES.decrypt(property.dataValues.type, SQLToken) : null;
                            decarb.push(property);
                            lane_name = property.dataValues.lane_name;
                        }

                    }
                    getProject.dataValues.DecarbRecommendations = [];
                    getProject.dataValues.DecarbRecommendations = decarb;
                }
            }
            let lane_intensity = await req.db.Emission.findOne({
                attributes: [[sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 2) )'), 'intensity']],
                where: sequelize.literal('( AES_DECRYPT(UNHEX(name),"' + SQLToken + '") = "' + lane_name + '" )'),
            });
            lane_intensity = lane_intensity.dataValues.intensity - ((getProject.dataValues.emission_percent / 100) * lane_intensity.dataValues.intensity)
            let data = {
                projectDetail: getProject,
                intensity: lane_intensity,
                lane_name: lane_name,
                list: projectDetail,
            }
            return Response.customSuccessResponseWithData(res, 'Project Details Fetched!', data, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}