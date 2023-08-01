const sequelize = require('sequelize');
const Op = sequelize.Op;
const Response = require("../helper/api-response");
const Helper = require("../helper/common-helper");
const moment = require('moment');
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes')
const randomstring = require("randomstring");
/**
 * @description API to get decarb recommended levers based on region_id , source and destionation.
 * @exception Parameter region_id, source and destionation is static because we have limited information for decarb recommendation section.
 * @param {region_id} req 
 * @param {*} res 
 * @returns 
 */
// exports.getRecommendedLevers = async (req, res) => {
//     try {
//         let { region_id } = req.body;
//         const where = {};
//         where[Op.or] = []
//         where[Op.or].push(
//             { source: AES.encrypt('SALT LAKE CITY,UT', SQLToken), destination: AES.encrypt('PERRIS, CA', SQLToken) }
//         )
//         // const where = { source: AES.encrypt('SALT LAKE CITY,UT', SQLToken), destination: AES.encrypt('PERRIS, CA', SQLToken) }
//         // if (region_id === undefined || region_id == "") {
//         //     region_id = 8;
//         // }
//         // if (region_id != 8) {
//         //     return Response.errorRespose(res, 'No Record Found!');
//         // }
//         where[Op.and] = []
//         if (region_id) {
//             where[Op.and].push({
//                 region_id: region_id
//             })
//         }
//         //  else {
//         //     where[Op.and].push({
//         //         region_id: [8,19,15,1]
//         //     })
//         // }
//         const Emissions = await req.db.Emission.findAll({
//             attributes: [
//             [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
//             [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'], 
//             [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
//             'region_id'],
//             include:[{
//                 model: req.db.Region,
//                 attributes: ['id','name']
//             }],
//             where: where,
//             group:['region_id']
//         });

//         if (Emissions) {
//             let data = [];
//             for (const property of Emissions) {
//                 data.push(
//                     {
//                         intensity: (Helper.roundToDecimal(property.dataValues.emission / property.dataValues.emission_per_ton)).toFixed(1),
//                         lane: 2,
//                         vendor: 1,
//                         tonnage: 0,
//                         region_id: property.dataValues.region_id,
//                         region_name: AES.decrypt(property.dataValues.Region.name, SQLToken)
//                     }
//                 )
//             }
//             return Response.customSuccessResponseWithData(res, 'Recommended levers data.', data, 200);
//         } else { return Response.errorRespose(res, 'No Record Found!'); }
//     } catch (error) {
//         console.log('____________________________________________________________error', error);
//     }
// }


/**
 * @description API to get customizze levers saved by the regional and sustainable manger.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
// exports.getCustomizeLevers = async (req, res) => {
//     try {
//         let { region_id } = req.body;
//         const where = {};
//         if (region_id) {
//             where[Op.and] = []
//             where[Op.and].push({
//                 region_id: region_id
//             })
//         }
//         let date = moment();
//         let currentData = date.format("YYYY-MM-DD");
//         let pastData = date.subtract(1, "year").format("YYYY-MM-DD");
//         let customizeData = await req.db.DecarbRecommendation.findAll({
//             where : where,
//             order: [[sequelize.literal('( AES_DECRYPT(UNHEX(lane_name),"' + SQLToken + '") )'), 'desc']]
//         });

//         //check password is matched or not then exec
//         let laneData = {};
//         if (customizeData) {
//             for (const property of customizeData) {
//                 let propertyLaneName = AES.decrypt(property.lane_name, SQLToken);
//                 let propertyOrigin = AES.decrypt(property.origin, SQLToken);
//                 let propertyDestination = AES.decrypt(property.destination, SQLToken);
//                 let propertyType = AES.decrypt(property.LOB, SQLToken);
//                 let propertyEmissions = (property.emissions) ? parseFloat(AES.decrypt(property.emissions, SQLToken)) : 0;
//                 let propertyFuelType = AES.decrypt(property.fuel_type, SQLToken);
//                 property.type = (property.type) ? AES.decrypt(property.type, SQLToken) : property.type;
//                 if(!laneData[propertyLaneName]) {
//                     laneData[propertyLaneName] = {};
//                 }
                
//                 if(!laneData[propertyLaneName][property.type]) {
//                     let original_emission = 0;
//                     let customize_emission = 0;
//                     let route = []
//                     let laneEmissionData = await req.db.Emission.findOne({
//                         attributes: ['id', [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) DIV SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
//                             [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")) )'), 'shipments']],
//                         where: {
//                             'name': property.lane_name, date: {
//                                 [Op.between]: [pastData, currentData],
//                             }
//                         },
//                         raw: true
//                     });
//                     if (property.type == 'alternative_fuel') {
//                         if (property.recommended_type == 'original') {
//                             original_emission = propertyEmissions;
//                         } else {
//                             route.push({
//                                 origin: AES.decrypt(property.origin, SQLToken),
//                                 destination: AES.decrypt(property.destination, SQLToken),
//                             })
//                             customize_emission = propertyEmissions;
//                         }
//                     } else {
//                         if (property.recommended_type == 'original') {
//                             original_emission = propertyEmissions;
//                         } else {
//                             customize_emission = propertyEmissions;
//                             route.push({
//                                 origin: propertyOrigin,
//                                 destination: propertyDestination
//                             })
//                         }
//                     }

//                     laneData[propertyLaneName][property.type] = {
//                         name: propertyLaneName,
//                         origin: propertyOrigin,
//                         destination: propertyDestination,
//                         original_emission: original_emission,
//                         customize_emission: customize_emission,
//                         route: route,
//                         shipments: laneEmissionData.shipments,
//                         intensity: laneEmissionData.intensity,
//                         type: propertyType,
//                         decarb_id: property.decarb_id
//                     }
//                 }

//                 if (laneData[propertyLaneName] && laneData[propertyLaneName][property.type]) {
//                     // Sonar remove if else
//                     if (property.recommended_type == 'original') {
//                         laneData[propertyLaneName][property.type]['original_emission'] += propertyEmissions;
//                     } else {
//                         laneData[propertyLaneName][property.type]['customize_emission'] += propertyEmissions;
//                         laneData[propertyLaneName][property.type]['route'].push({
//                             origin: propertyOrigin,
//                             destination: propertyDestination,
//                             type: propertyType,
//                             emissions: propertyEmissions,
//                             fuel_type: propertyFuelType,
//                         });
//                     }
//                 }
//             }
//             return Response.customSuccessResponseWithData(res, 'Recommended levers data.', laneData, 200)
//         } else { return Response.errorRespose(res, 'No Record Found!'); }
//     } catch (error) {
//         console.log('____________________________________________________________error', error);
//     }
// }

exports.getRecommendedLevers = async (req, res) => {
    try {
        let {region_id, year, quarter} = req.body;
        const where = {};
        const whereCount = {};
        whereCount[Op.and] = [];
        where[Op.and] = []
        where[Op.and].push({
            region_id :[17,13,5,3,9,12]
        })

        if (region_id || year || quarter) {
                  
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push({'year':year})
                whereCount[Op.and].push({'year':year})
            }
            if (quarter) {
                where[Op.and].push({'quarter':quarter})
                whereCount[Op.and].push({'quarter':quarter})
            }
        }

        const getRegionEmissions = await req.db.SummerisedEmission.findAll({
            attributes: [[sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
             [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/ 1000000 )'), 'emission']],
            where: where, 
            include: [
                {
                    model: req.db.Region,
                    attributes: ['id','name']
                }],
            group: ['Region.name','Region.id'],
            order: [['intensity', 'desc']],
            raw: true
        });

        if (getRegionEmissions) {
            let contributor = [];
            let detractor = [];
            let unit = 'g';
            let total = [];
            // if (toggel_data == 1) {
            //     unit = 'tCo2e';
            // }
            let convertToMillion = 1000000;
            //NEW CODE
            for (const property of getRegionEmissions) {
                let intensityData = property.intensity;
                // if (toggel_data == 1) {
                //     intensityData = property.emission / convertToMillion;
                // }

                total.push(Helper.roundToDecimal(intensityData));
            }
            const average = (total.length > 0) ? Helper.roundToDecimal(total.reduce((a, b) => a + b, 0) / total.length) : 0;

            for (const property of getRegionEmissions) {

                let intensityData = Helper.roundToDecimal(property.intensity - average);
                let compareValue = property.intensity;
                // if (toggel_data == 1) {
                //     compareValue = property.emission / convertToMillion;
                //     intensityData = Helper.roundToDecimal((property.emission / convertToMillion) - average);
                // }
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property["Region.name"], SQLToken),
                        region_id: property["Region.id"],
                        intensity : property.intensity,
                        emission: property.emission,
                        type: 'HIGHEST PRIORITY',
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property["Region.name"], SQLToken),
                        region_id: property["Region.id"],
                        intensity : property.intensity,
                        emission: property.emission,
                        type: 'LOW PRIORITY',
                        color: '#215154'
                    })
                }
            }
            let mediumPriority = [];
            let lowPriority = [];
            let contributorLenght = contributor.length;
            let thirdMedian = true;
            if (contributorLenght > 0) {
                contributor[contributorLenght - 1]['color'] = '#efede9';
                contributor[contributorLenght - 1]['type'] = 'MEDIUM PRIORITY';
                mediumPriority.push(contributor[contributorLenght - 1]);
                if(contributorLenght > 1) {
                    thirdMedian = false;
                    contributor[contributorLenght - 2]['color'] = '#efede9';
                    contributor[contributorLenght - 2]['type'] = 'MEDIUM PRIORITY';
                    mediumPriority.push(contributor[contributorLenght - 2]);
                }
            }
            let detractorLenght = detractor.length;
            if (detractorLenght > 0) {
                detractor[0]['color'] = '#efede9';
                detractor[0]['type'] = 'MEDIUM PRIORITY';
                mediumPriority.push(detractor[0]);
                lowPriority.push(detractor[detractorLenght - 1]);
                if(detractorLenght > 1 && thirdMedian) {
                    thirdMedian = false;
                    detractor[1]['color'] = '#efede9';
                    detractor[1]['type'] = 'MEDIUM PRIORITY';
                    mediumPriority.push(detractor[1]);
                }
            }

            const highPriority = contributor.sort((a,b) => b.price - a.price).slice(0, 2);
            const data = [...highPriority,...mediumPriority,...lowPriority];
            const seen = new Set();
            const filteredArr = data.filter(el => {
                const duplicate = seen.has(el.name);
                seen.add(el.name);
                return !duplicate;
            });
            const responseData = [];
            for (const property of filteredArr) {
                let whereTotalCount = {};
                let lanesCount = await req.db.EmissionLanes.findOne(
                    {   
                        attributes: [[sequelize.literal('COUNT(DISTINCT name )'), 'total_count']],
                        where: [...whereCount[Op.and],{'region_id':property.region_id}],
                    }
                );
                let total_count = await req.db.CarrierEmissions.findOne(
                    {                   
                        attributes: [[sequelize.literal('COUNT(DISTINCT carrier_name )'), 'total_count']],
                        where: [...whereCount[Op.and],{'region_id':property.region_id}],
                    }
                );
                responseData.push({
                    region_name: property.name,
                    region_id: property.region_id,
                    intensity: property.intensity,
                    emission: property.emission,
                    type: property.type,
                    lane: lanesCount.dataValues.total_count,
                    vendor: total_count.dataValues.total_count
                });
            }
            return Response.customSuccessResponseWithData(res, 'Region Emissions', responseData, 200)
        }
        
        const Emissions = await req.db.Emission.findAll({
            attributes: [
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'], 
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
            'region_id'],
            include:[{
                model: req.db.Region,
                attributes: ['id','name']
            }],
            where: where,
            group:['region_id'],
            order:[['region_id','asc']]
        });

        if (Emissions) {
            let data = [];
            for (const property of Emissions) {
                data.push(
                    {
                        intensity: (Helper.roundToDecimal(property.dataValues.emission / property.dataValues.emission_per_ton)).toFixed(1),
                        lane: 2,
                        vendor: 1,
                        tonnage: 0,
                        region_id: property.dataValues.region_id,
                        region_name: AES.decrypt(property.dataValues.Region.name, SQLToken)
                    }
                )
            }
            return Response.customSuccessResponseWithData(res, 'Recommended levers data.', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}

/**
 * @description API to get customizze levers saved by the regional and sustainable manger.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.getCustomizeLevers = async (req, res) => {
    try {
        let { region_id } = req.body;
        const where = {};
        if (region_id) {
            where[Op.and] = []
            where[Op.and].push({
                region_id: region_id
            })
        }
        let date = moment();
        let currentData = date.format("YYYY-MM-DD");
        let pastData = date.subtract(1, "year").format("YYYY-MM-DD");
        let customizeData = await req.db.DecarbRecommendation.findAll({
            where : where,
            order: [['id', 'desc']]
        });
       // res.send(customizeData);
        //check password is matched or not then exec
        let laneData = {};
        if (customizeData) {
            for (const property of customizeData) {
                let propertyLaneName = AES.decrypt(property.lane_name, SQLToken);
                let propertyOrigin = AES.decrypt(property.origin, SQLToken);
                let propertyDestination = AES.decrypt(property.destination, SQLToken);
                let propertyType = AES.decrypt(property.LOB, SQLToken);
                let propertyEmissions = 55840.88;//(property.emissions) ? parseFloat(AES.decrypt(property.emissions, SQLToken)) : 0;
                let propertyFuelType = AES.decrypt(property.fuel_type, SQLToken);
                let propertyCarrierName = property?.carrier_name?AES.decrypt(property.carrier_name, SQLToken):null;
                let propertyCarrierLogo = property.carrier_logo;
                property.type = (property.type) ? AES.decrypt(property.type, SQLToken) : property.type;
                if(!laneData[propertyLaneName]) {
                    laneData[propertyLaneName] = {};
                }
                let route = []
                if(!laneData[propertyLaneName][property.type]) {
                    let original_emission = 0;
                    let customize_emission = 0;
                   
                    
                    if (property.recommended_type == 'original') {
                        original_emission = propertyEmissions;
                    } else {
                        customize_emission = propertyEmissions;
                        // route.push({
                        //     origin: propertyOrigin,
                        //     destination: propertyDestination
                        // })
                    }

                    let laneEmission = 0;
                    let laneShipment = 0;
                    let laneIntensity = 0;
                    let lanedto = null

                    let total_emission_data = await req.db.Emission.findOne({
                        attributes: [[sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) DIV SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")/1000000))'), 'emission'],
                            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")) )'), 'shipments'],
                        ],
                        where: {
                            'name': property.lane_name, date: {
                                [Op.between]: [pastData, currentData],
                            },
                            'region_id': region_id
                        }
                    });
                    if (property.type == 'alternative_fuel' || property.type == 'modal_shift') {
                        if (property.recommended_type == 'original') {
                            original_emission = propertyEmissions;
                        } else {
                            let laneEmissionData = await req.db.Emission.findOne({
                                attributes: [[sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) DIV SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")/1000000))'), 'emission'],
                                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")) )'), 'shipments'],
                                    'carrier_name',
                                    'carrier_logo'
                                ],
                                where: {
                                    'name': property.lane_name, date: {
                                        [Op.between]: [pastData, currentData],
                                    },
                                    'region_id': region_id
                                },
                                order : [['emission','asc']],
                                raw: true
                            });
                            route.push({
                                origin: AES.decrypt(property.origin, SQLToken),
                                destination: AES.decrypt(property.destination, SQLToken),
                                type: propertyType,
                                emissions: propertyEmissions,
                                fuel_type: "RD80",
                                carrier_name : propertyCarrierName,
                                carrier_logo : propertyCarrierLogo
                            })
                            lanedto = laneEmissionData;
                            customize_emission = propertyEmissions;
                            laneShipment = laneEmissionData.shipments;
                            laneEmission = laneEmissionData.emission;
                            laneIntensity = laneEmissionData.intensity;
                        }
                    }  else {
                        let laneEmissionData = await req.db.Emission.findAll({
                            attributes: [[sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) DIV SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")/1000000))'), 'emission'],
                                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")) )'), 'shipments'],
                                'carrier_name',
                                'carrier_logo'
                            ],
                            where: {
                                'name': property.lane_name, date: {
                                    [Op.between]: [pastData, currentData],
                                },
                                'region_id': region_id
                            },
                            group: ['carrier_name','carrier_logo'],
                            order : [['emission','asc']],
                            raw: true
                        });
                        
                        for (const propertylane of laneEmissionData) {
                            route.push({
                                origin: propertyOrigin,
                                destination: propertyDestination,
                                type: propertyType,
                                emissions: propertylane.emission,
                                fuel_type: "RD80",
                                carrier_name : propertylane?.carrier_name?AES.decrypt(propertylane.carrier_name, SQLToken):null,
                                carrier_logo : propertylane.carrier_logo
                            })
                            lanedto = laneEmissionData;
                            laneShipment = laneShipment+propertylane.shipments;
                            laneEmission = laneShipment+propertylane.emission;
                            laneIntensity = laneIntensity+propertylane.intensity;
                        }
                    }
                    
                    // else {
                    //     if (property.recommended_type == 'original') {
                    //         original_emission = propertyEmissions;
                    //     } else {
                    //         customize_emission = propertyEmissions;
                    //         route.push({
                    //             origin: propertyOrigin,
                    //             destination: propertyDestination
                    //         })
                    //     }
                    // }
                    

                    laneData[propertyLaneName][property.type] = {
                        name: propertyLaneName,
                        origin: propertyOrigin,
                        destination: propertyDestination,
                        original_emission: original_emission,
                        customize_emission: customize_emission,
                        route: route,
                        shipments: total_emission_data.dataValues.shipments,
                        intensity: total_emission_data.dataValues.intensity,
                        emission: total_emission_data.dataValues.emission,
                        type: propertyType,
                        decarb_id: property.decarb_id,
                        lanedto: lanedto
                    }
                }

                if (laneData[propertyLaneName] && laneData[propertyLaneName][property.type]) {
                    // Sonar remove if else
                    if (property.recommended_type == 'original') {
                        laneData[propertyLaneName][property.type]['original_emission'] += propertyEmissions;
                    } else {
                        laneData[propertyLaneName][property.type]['customize_emission'] += propertyEmissions;
                        // laneData[propertyLaneName][property.type]['route'].push({
                        //     origin: propertyOrigin,
                        //     destination: propertyDestination,
                        //     type: propertyType,
                        //     emissions: propertyEmissions,
                        //     fuel_type: "RD80",
                        // });

                        if (property.type == 'alternative_fuel' || property.type == 'modal_shift') {
                            let laneEmissionData = await req.db.Emission.findOne({
                                attributes: [[sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) DIV SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")/1000000))'), 'emission'],
                                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")) )'), 'shipments'],
                                    'carrier_name',
                                    'carrier_logo'
                                ],
                                where: {
                                    'name': property.lane_name, date: {
                                        [Op.between]: [pastData, currentData],
                                    },
                                    'region_id': region_id
                                },
                                order : [['emission','asc']],
                                raw: true
                            });
                            laneData[propertyLaneName][property.type]['route'].push({
                                origin: AES.decrypt(property.origin, SQLToken),
                                destination: AES.decrypt(property.destination, SQLToken),
                                type: propertyType,
                                emissions: propertyEmissions,
                                fuel_type: "RD80",
                                carrier_name : propertyCarrierName,
                                carrier_logo : propertyCarrierLogo
                            });
                            laneData[propertyLaneName][property.type]['customize_emission']  = propertyEmissions;  
                            laneData[propertyLaneName][property.type]['laneShipment']    = laneEmissionData.shipments;
                            laneData[propertyLaneName][property.type]['laneEmission']    = laneEmissionData.emission;
                            laneData[propertyLaneName][property.type]['laneIntensity']    = laneEmissionData.intensity;
                            laneData[propertyLaneName][property.type]['lanedto']    = laneEmissionData;

                            
                        }
                    }
                }
            }
            return Response.customSuccessResponseWithData(res, 'Recommended levers data.', laneData, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}



/**
 * @description API to get lane comparison graph data.
 * @exception Carrier Emissions table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data, lane_name} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.insertIntoDecarbRecommdation = async (req, res) => {
    try {
        let region_id = [3,7,8,15,17,18];

        for (const property of region_id) {
            let randomString = randomstring.generate(10);
                // await req.db.DecarbRecommendation.bulkCreate([
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'PORT WENTWORTH, GA_LEBANON, OR',
                //         origin: 'PORT WENTWORTH, GA',
                //         destination: 'LEBANON, OR',
                //         LOB: 'IM',
                //         fuel_type: 'PD',
                //         emissions: '55845',
                //         date:'2022-01-03',
                //         grs_wgt_qty: '43643',
                //         loaded_miles: '24.7',
                //         uploaded_miles: '0',
                //         mpg: '5.8',
                //         fuel_use: '107.145',
                //         type: 'modal_shift',
                //         recommended_type: 'original',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'PORT WENTWORTH, GA_LEBANON, OR',
                //         origin: 'PORT WENTWORTH, GA',
                //         destination: 'LEBANON, OR',
                //         LOB: 'LOB_VAN TL',
                //         fuel_type: 'RD80',
                //         emissions: '800096',
                //         date: '2022-10-08',
                //         grs_wgt_qty: '',
                //         loaded_miles: '',
                //         uploaded_miles: '',
                //         mpg: '',
                //         fuel_use: '6.2',
                //         type: 'modal_shift',
                //         recommended_type: 'recommended',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'PORT WENTWORTH, GA_LEBANON, OR',
                //         origin: 'PORT WENTWORTH, GA',
                //         destination: 'LEBANON, OR',
                //         LOB: 'IM',
                //         fuel_type: 'PD',
                //         emissions: '55845',
                //         date:'2022-01-03',
                //         grs_wgt_qty: '43643',
                //         loaded_miles: '24.7',
                //         uploaded_miles: '0',
                //         mpg: '5.8',
                //         fuel_use: '107.145',
                //         type: 'modal_shift',
                //         recommended_type: 'original',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'PORT WENTWORTH, GA_LEBANON, OR',
                //         origin: 'PORT WENTWORTH, GA',
                //         destination: 'LEBANON, OR',
                //         LOB: 'LOB_VAN TL',
                //         fuel_type: 'RD80',
                //         emissions: '800096',
                //         date: '2022-10-08',
                //         grs_wgt_qty: '',
                //         loaded_miles: '',
                //         uploaded_miles: '',
                //         mpg: '',
                //         fuel_use: '6.2',
                //         type: 'modal_shift',
                //         recommended_type: 'recommended',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'ATLANTA, GA_PHOENIX, AZ',
                //         origin: 'ATLANTA, GA',
                //         destination: 'PHOENIX, AZ',
                //         LOB: 'IM',
                //         fuel_type: 'PD',
                //         emissions: '55845',
                //         date:'2022-01-03',
                //         grs_wgt_qty: '43643',
                //         loaded_miles: '24.7',
                //         uploaded_miles: '0',
                //         mpg: '5.8',
                //         fuel_use: '107.145',
                //         type: 'alternative_fuel',
                //         recommended_type: 'original',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'ATLANTA, GA_PHOENIX, AZ',
                //         origin: 'ATLANTA, GA',
                //         destination: 'PHOENIX, AZ',
                //         LOB: 'LOB_VAN TL',
                //         fuel_type: 'RD80',
                //         emissions: '800096',
                //         date: '2022-10-08',
                //         grs_wgt_qty: '',
                //         loaded_miles: '',
                //         uploaded_miles: '',
                //         mpg: '',
                //         fuel_use: '6.2',
                //         type: 'alternative_fuel',
                //         recommended_type: 'recommended',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'ATLANTA, GA_PHOENIX, AZ',
                //         origin: 'ATLANTA, GA',
                //         destination: 'PHOENIX, AZ',
                //         LOB: 'IM',
                //         fuel_type: 'PD',
                //         emissions: '55845',
                //         date:'2022-01-03',
                //         grs_wgt_qty: '43643',
                //         loaded_miles: '24.7',
                //         uploaded_miles: '0',
                //         mpg: '5.8',
                //         fuel_use: '107.145',
                //         type: 'alternative_fuel',
                //         recommended_type: 'original',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'ATLANTA, GA_PHOENIX, AZ',
                //         origin: 'ATLANTA, GA',
                //         destination: 'PHOENIX, AZ',
                //         LOB: 'LOB_VAN TL',
                //         fuel_type: 'RD80',
                //         emissions: '800096',
                //         date: '2022-10-08',
                //         grs_wgt_qty: '',
                //         loaded_miles: '',
                //         uploaded_miles: '',
                //         mpg: '',
                //         fuel_use: '6.2',
                //         type: 'alternative_fuel',
                //         recommended_type: 'recommended',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'BAKERSFIELD,CA_MODESTO, CA',
                //         origin: 'BAKERSFIELD,CA',
                //         destination: 'MODESTO, CA',
                //         LOB: 'IM',
                //         fuel_type: 'PD',
                //         emissions: '55845',
                //         date:'2022-01-03',
                //         grs_wgt_qty: '43643',
                //         loaded_miles: '24.7',
                //         uploaded_miles: '0',
                //         mpg: '5.8',
                //         fuel_use: '107.145',
                //         type: 'carrier_shift',
                //         recommended_type: 'original',
                //     },
                //     { 	region_id: property, 
                //         decarb_id: randomString,
                //         lane_name: 'BAKERSFIELD,CA_MODESTO, CA',
                //         origin: 'BAKERSFIELD,CA',
                //         destination: 'MODESTO, CA',
                //         LOB: 'LOB_VAN TL',
                //         fuel_type: 'RD80',
                //         emissions: '800096',
                //         date: '2022-10-08',
                //         grs_wgt_qty: '',
                //         loaded_miles: '',
                //         uploaded_miles: '',
                //         mpg: '',
                //         fuel_use: '6.2',
                //         type: 'carrier_shift',
                //         recommended_type: 'recommended',
                //     }
                // ]);  
        }
        return Response.customSuccessResponseWithData(res, 'Recommended levers inserted successfully.', 'laneData', 200)
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}


exports.updateDecarbLanes = async (req, res) => {
    try {
        let customizeData = await req.db.DecarbRecommendation.findAll({
            where : where,
            order: [['id', 'desc']]
        });
        for (const property of region_id) {
            let randomString = randomstring.generate(10);
        }
        return Response.customSuccessResponseWithData(res, 'Recommended levers inserted successfully.', 'laneData', 200)
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}